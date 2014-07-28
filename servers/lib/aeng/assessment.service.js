/**
 * Assessment DistillerService Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  redis      - https://github.com/mranney/node_redis
 *  couchnode  - https://github.com/couchbase/couchnode
 *
 */
var fs      = require('fs');
var path    = require('path');
// Third-party libs
var _       = require('lodash');
var when    = require('when');
var child_process   = require('child_process');
// Glasslab libs
var Util;

module.exports = DistillerService;

function DistillerService(options){
    var Assessment;

    // Glasslab libs
    Util       = require('../core/util.js');
    Assessment = require('./assessment.js');

    this.options = _.merge(
        {
            distiller: {
                getMax:    20,
                pollDelay: 1000,          // (1 second) in milliseconds
                cleanupPollDelay: 3600000 // (1 hour)   in milliseconds
            }
        },
        options
    );

    this.requestUtil   = new Util.Request(this.options);
    this.queue         = new Assessment.Queue.Redis(this.options.assessment.queue);
    this.stats         = new Util.Stats(this.options, "Assessment.DistillerService");

    // TODO: move to DB
    this.engines = {};
    this.loadEngines();

    /*
    // TODO: remove this after running test
    this.addAllOldSessionsForProcess()
        .then(function(){
            this.startTelemetryPoll();
        }.bind(this),
        function(err){
            console.trace("DistillerService: Add All Old Session For Process Error -", err);
            this.stats.increment("error", "Assessment.OldSessionProcess");
        }.bind(this));
    */
    this.startTelemetryPoll();

    console.log('---------------------------------------------');
    console.log('DistillerService: Waiting for messages...');
    console.log('---------------------------------------------');
    this.stats.increment("info", "ServerStarted");
}

/*
DistillerService.prototype.addAllOldSessionsForProcess = function() {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this._getAllGameSessions()
        .then(function(sessionList){
            var promiseList = [];

            for(var i = 0; i < sessionList.length; i++) {
                // add queue push api to promise list
                promiseList.push( this.queue.pushJob( sessionList[i] ) );
            }

            return when.all(promiseList);
        }.bind(this))

        .then(function(){
            console.log("Done adding all old sessions for process");
        }.bind(this))

        .then(resolve, reject);
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
*/

DistillerService.prototype.loadEngines = function() {

    // loop thought all the engines
    try{
        //console.log("DistillerService - loadEngines cwd:", process.cwd());
        var dir = path.resolve("./lib/aeng/engines");
        var files = fs.readdirSync(dir);

        console.log("DistillerService: Loading Engines...");
        files.forEach(function(file){
            // skip dot files
            if(file.charAt(0) != '.') {
                var name = path.basename(file, path.extname(file));
                var edir = dir + path.sep + name + path.sep;

                try {
                    console.log("DistillerService: Loading Engines", name);

                    var engine = require(edir + 'engine.js');
                    this.engines[name] = new engine(edir);
                } catch(err) {
                    console.error("DistillerService: Load Engines Error -", err);
                }
            }
        }.bind(this));
        console.log("DistillerService: Done Loading Engines");
    } catch(err) {
        console.error("DistillerService: Load Engines Error -", err);
    }
};

DistillerService.prototype.startTelemetryPoll = function(){
    // fetch assessment loop
    setInterval(function() {
        this.checkForJobs();
    }.bind(this), this.options.distiller.pollDelay);
};

DistillerService.prototype.checkForJobs = function() {
    this.queue.getJobCount()
        .then(
            function(count) {
                if(count > 0) {
                    console.log("DistillerService: checkForJobs count:", count);
                    this.stats.increment("info", "GetIn.Count", count);

                    for(var i = 0; i < Math.min(count, this.options.distiller.getMax); i++){
                        this.getJob();
                    }
                }
            }.bind(this),
            function(err) {
                console.error("DistillerService: checkForJobs Error:", err);
                this.stats.increment("error", "checkForJobs.GetInCount");
            }.bind(this)
        );
};

DistillerService.prototype.getJob = function() {

    this.queue.popJob()
        // cleanup session
        .then(function(data){
            // skip if no data
            if(!data) return;

            if( this.queue.isEnded(data) ) {
                console.log("DistillerService: getJob",
                    "- userId:", data.userId,
                    ", gameSessionId:", data.gameSessionId,
                    ", gameId:", data.gameId,
                    ", jobType:", data.jobType );
                return this.runAssessment(data.userId, data.gameSessionId, data.gameId, data.jobType)
                    .then( function(){
                        // TODO: use assessment DS for queue
                        return this._endQSession(data.gameSessionId)
                    }.bind(this) );
            } else {
                // TODO: use assessment DS for queue
                return this._cleanupQSession(data.gameSessionId);
            }
        }.bind(this))

        // catch all ok
        .then( function(){
            //console.log("DistillerService: all done");
        }.bind(this))

        // catch all errors
        .then(null, function(err) {
            console.error("DistillerService: getJob - Error:", err);
            this.stats.increment("error", "getJob");
        }.bind(this));
};

// session, game, engine, message
DistillerService.prototype.runAssessment = function(userId, gameSessionId, gameId, jobType){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    if( !gameId ||
        !gameId.length) {
        // default to using SimCity's
        gameId = 'SC';
    }
    gameId = gameId.toUpperCase(); // gameId is not case sensitive

    this._getGameAssessmentDefinitions(gameId)
        .then(function(aInfo){
            //console.log("aInfo:", aInfo);

            var promiseList = [];
            var allEvents = null;
            var gameSessionEvents = null;
            var dataPromise, enginePromise;

            aInfo.forEach(function(ai) {
                // if enabled and engine exists
                if( ai.enabled &&
                    ai.engine ) {
                    var engine = ai.engine.toLowerCase();

                    dataPromise = Util.PromiseContinue();
                    // return cached data or get data and pass it to the enginePromise
                    if( ai.dataProcessScope ) {
                        if( ai.dataProcessScope == "all" && !allEvents) {
                            dataPromise = this._getUserEvents(gameId, userId)
                                .then(function(data) {
                                    allEvents = data;
                                    return allEvents;
                                }.bind(this));
                        }
                        // already has the data pass it along
                        else if( ai.dataProcessScope == "all" && allEvents) {
                            dataPromise = when.promise( function(resolve) {
                                resolve( allEvents );
                            });
                        }
                        else if( ai.dataProcessScope == "gameSession" && !gameSessionEvents) {
                            dataPromise = this._getSessionEvents(gameSessionId)
                                .then(function(data){
                                    gameSessionEvents = data;
                                    return gameSessionEvents;
                                }.bind(this));
                        }
                        // already has the data pass it along
                        else if( ai.dataProcessScope == "gameSession" && gameSessionEvents) {
                            dataPromise = when.promise( function(resolve) {
                                resolve( gameSessionEvents );
                            });
                        }
                    }

                    // run engines
                    enginePromise = dataPromise
                        .then(function(eventsData) {
                            console.log("DistillerService: Starting Running - Engine:", engine);
                            return this._engineRun(engine, gameSessionId, userId, gameId, eventsData, ai);
                        }.bind(this));

                    // add to promise List
                    promiseList.push( enginePromise );
                }
            }.bind(this));

            when.all(promiseList)
                .then(function(){
                    console.log("DistillerService: gameSessionId:", gameSessionId, ", All done!");
                    resolve();
                }.bind(this))
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


DistillerService.prototype._engineRun = function(engine, gameSessionId, userId, gameId, eventsData, aInfo) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        // eventsData is an object or an array
        if( !eventsData ) {
            if(this.options.env == "dev") {
                console.log("DistillerService: Execute Assessment - No Events - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
            }
            // nothing to process
            resolve();
            return;
        }

        // turn eventsData into array if not one
        if( !_.isArray(eventsData) ) {
            eventsData = [ eventsData ];
        }

        if( !eventsData.length ||
            !( eventsData[0].events &&
               eventsData[0].events.length ) ) {
            if(this.options.env == "dev") {
                console.log("DistillerService: Execute Assessment - No Events - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
            }
            // nothing to process
            resolve();
            return;
        }
        console.log("DistillerService: Processing - Engine:", engine, ", # Sessions:", eventsData.length);

        // saving current path to restore later
        var cDir = process.cwd();
        //console.log("Current Directory Before \""+engine+"\":", process.cwd());

        // check if engine path exists
        var path = "./lib/aeng/engines/"+engine;
        if( !fs.existsSync(path) ) {
            console.log("DistillerService: Execute Assessment - No Engine Path - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
            // nothing to process
            resolve();
            return;
        }
        // change current dir to engine dir
        process.chdir( path );
        //console.log("Current Directory Inside \""+engine+"\":", process.cwd());

        if(this.options.env == "dev") {
            console.log("DistillerService: Execute Assessment Started - gameSessionId:", gameSessionId, ", gameId:", gameId);
        }
        this.stats.increment("info", "ExecuteAssessment.Started");

        var enginePromise;
        if(this.engines[engine]) {
            enginePromise = this.engines[engine].run(gameSessionId, gameId, eventsData);
        }
        else {
            enginePromise = Util.PromiseContinue();
        }

        enginePromise
            .then(function(results){
                if(results) {
                    // get session info (userId, courseId)
                    console.log( "DistillerService: Saving Assessment...");

                    var out = {
                        timestamp: Util.GetTimeStamp(),
                        assessmentId:  aInfo.id,
                        engine:        engine,
                        gameSessionId: gameSessionId,
                        gameId:  gameId,
                        userId:  userId,
                        results: results
                    };
                    console.log( "DistillerService: Assessment results:", out);
                    return this._saveAEResults(gameId, out);
                }
            }.bind(this))

            .then(function(){
                console.log("DistillerService: Done Running - Engine:", engine);

                process.chdir( cDir );
                //console.log("Current Directory After \""+engine+"\":", process.cwd());

                resolve();
            }.bind(this))

            // catch all errors
            .then(null, function(err){
                console.log("DistillerService: Assessment Execution - Error:", err);

                // nothing to do
                if(this.options.env == "dev") {
                    console.log("DistillerService: Skipping Assessment Execution - gameSessionId:", gameSessionId, ", gameId:", gameId);
                }
                this.stats.increment("info", "ExecuteAssessment.Skipping");

                reject(err);
            }.bind(this));

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


DistillerService.prototype._endQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/end", { id: id });
};

DistillerService.prototype._cleanupQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/cleanup", { id: id });
};

DistillerService.prototype._getSessionEvents = function(gameSessionId) {
    return this._internalTelemetryRequest("/int/v1/data/session/"+gameSessionId+"/events");
};

DistillerService.prototype._getUserEvents = function(gameId, userId) {
    return this._internalTelemetryRequest("/int/v1/data/game/"+gameId+"/user/"+userId+"/events");
};


DistillerService.prototype._getGameAssessmentDefinitions = function(gameId) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/assessment/definitions");
};

DistillerService.prototype._saveAEResults = function(gameId, data) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/assessment/results", data);
};


// TODO: move this to core service routing
DistillerService.prototype._internalTelemetryRequest = function(route, data) {
    var protocal = this.options.telemetry.protocal || 'http:';
    var host = this.options.telemetry.host || 'localhost';
    var port = this.options.telemetry.port || 8002;
    var url = protocal + "//" + host + ":" + port + route;

    return this.requestUtil.request(url, data);
};
