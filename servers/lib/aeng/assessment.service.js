/**
 * Assessment Engine Module
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
var guard   = require('when/guard');
var child_process   = require('child_process');
// Glasslab libs
var Util;

module.exports = AssessmentEngine;

function AssessmentEngine(options){
    var Assessment;

    // Glasslab libs
    Util       = require('../core/util.js');
    Assessment = require('./assessment.js');

    this.options = _.merge(
        {
            assessment: {
                getMaxFromQueue:      20,
                checkQueueInterval:   1000,              // 1 second  in milliseconds
                checkActiveInterval:  300000, // 5 minutes in milliseconds
                cleanupQueueInterval: 3600000 // 1 hour    in milliseconds
            }
        },
        options
    );

    this.requestUtil   = new Util.Request(this.options);
    this.queue         = new Assessment.Queue.Redis(this.options.assessment.queue);
    this.stats         = new Util.Stats(this.options, "AssessmentEngine");

    // TODO: move to DB
    this.engines = {};
    this.loadEngines();

    //this.queue.clearJobs();

    /*
    // TODO: remove this after running test
    this.addAllOldSessionsForProcess()
        .then(function(){
            this.startTelemetryPoll();
        }.bind(this),
        function(err){
            console.trace("AssessmentEngine: Add All Old Session For Process Error -", err);
            this.stats.increment("error", "Assessment.OldSessionProcess");
        }.bind(this));
    */
    this.startTimers();

    console.log('---------------------------------------------');
    console.log('AssessmentEngine: Waiting for messages...');
    console.log('---------------------------------------------');
    this.stats.increment("info", "ServerStarted");
}

/*
 AssessmentEngine.prototype.addAllOldSessionsForProcess = function() {
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

AssessmentEngine.prototype.loadEngines = function() {

    // loop thought all the engines
    try{
        //console.log("AssessmentEngine - loadEngines cwd:", process.cwd());
        var dir = path.resolve("./lib/aeng/engines");
        var files = fs.readdirSync(dir);

        console.log("AssessmentEngine: Loading Engines...");
        files.forEach(function(file) {
            // skip dot files
            if(file.charAt(0) != '.') {
                var name = path.basename(file, path.extname(file));
                var edir = dir + path.sep + name + path.sep;

                try {
                    console.log("AssessmentEngine: Loading Engines", name);

                    var engine = require(edir + 'engine.js');
                    this.engines[name] = new engine(edir);
                } catch(err) {
                    console.error("AssessmentEngine: Load Engines Error -", err);
                }
            }
        }.bind(this));
        console.log("AssessmentEngine: Done Loading Engines");
    } catch(err) {
        console.error("AssessmentEngine: Load Engines Error -", err);
    }
};

AssessmentEngine.prototype.startTimers = function(){
    // fetch assessment loop
    this.startTime(this.checkForJobs, this.options.assessment.checkQueueInterval);

    // check if need to add items to jobs
    this.startTime(this.checkActivity, this.options.assessment.checkQueueInterval);
};

AssessmentEngine.prototype.startTime = function(func, interval) {
    setTimeout(function () {
        func.call(this)
            .then(function () {
                this.startTime(func, interval);
            }.bind(this));
    }.bind(this), interval);
};

AssessmentEngine.prototype.checkActivity = function() {
    return this.queue.getActivity()
        .then(
        function(activity) {

            //console.log("activity:", activity);
            if(activity && activity.length) {
                console.log("activity Count:", activity.length);

                // executes this "1" at a time
                var guardedAsyncOperation = guard(guard.n(1), function(activity){
                    return this.queue.pushJob("active", activity.userId, activity.gameId, activity.gameSessionId);
                }.bind(this));

                when.map(activity, guardedAsyncOperation)
                    .then(function(){
                        //console.log("All Done!");
                        this.queue.clearActivity();
                    }.bind(this))

                    // catch all error
                    .then(null, function(err){
                        console.error("AssessmentEngine: checkActivity Error:", err);
                    }.bind(this));

            }

        }.bind(this),
        function(err) {
            console.error("AssessmentEngine: checkActivity Error:", err);
            this.stats.increment("error", "checkActivity");
        }.bind(this)
    );
};

AssessmentEngine.prototype.checkForJobs = function() {
    return this.queue.getJobCount()
        .then(
            function(count) {
                if(count > 0) {
                    console.log("AssessmentEngine: checkForJobs count:", count);
                    this.stats.increment("info", "GetIn.Count", count);

                    // creates zero filled array
                    count = Math.min(count, this.options.assessment.getMaxFromQueue)
                    var list = Array.apply(null, new Array(count)).map(Number.prototype.valueOf, 0);

                    // executes this "1" at a time
                    var guardedAsyncOperation = guard(guard.n(1), function(){
                        return this.getJob();
                    }.bind(this));

                    when.map(list, guardedAsyncOperation)
                        .then(function(){
                            //console.log("All Done!");
                        }.bind(this))

                        // catch all error
                        .then(null, function(err){
                            console.error("AssessmentEngine: checkForJobs Error:", err);
                        }.bind(this));
                }
            }.bind(this),
            function(err) {
                console.error("AssessmentEngine: checkForJobs Error:", err);
                this.stats.increment("error", "checkForJobs.GetInCount");
            }.bind(this)
        );
};

AssessmentEngine.prototype.getJob = function() {
    var jobData = {};
    return this.queue.popJob()
        // cleanup session
        .then(function(data){
            // skip if no data
            if(!data) return;

            jobData = data;
            if( this.queue.isEnded(data) ) {
                console.log("AssessmentEngine: Start Job",
                    "- userId:", jobData.userId,
                    ", gameSessionId:", jobData.gameSessionId,
                    ", gameId:", jobData.gameId,
                    ", jobType:", jobData.jobType );
                return this.runAssessment(data.userId, data.gameId, data.gameSessionId, data.jobType)
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
            console.log("AssessmentEngine: Job Done",
                "- userId:", jobData.userId,
                ", gameSessionId:", jobData.gameSessionId,
                ", gameId:", jobData.gameId,
                ", jobType:", jobData.jobType );
        }.bind(this))

        // catch all errors
        .then(null, function(err) {
            console.error("AssessmentEngine: getJob - Error:", err);
            this.stats.increment("error", "getJob");
        }.bind(this));
};

// session, game, engine, message
AssessmentEngine.prototype.runAssessment = function(userId, gameId, gameSessionId, jobType){
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
                            console.log("AssessmentEngine: Starting Running - Engine:", engine);
                            return this._engineRun(engine, gameSessionId, userId, gameId, eventsData, ai);
                        }.bind(this));

                    // add to promise List
                    promiseList.push( enginePromise );
                }
            }.bind(this));

            when.all(promiseList)
                .then(function(){
                    //console.log("AssessmentEngine: gameSessionId:", gameSessionId, ", All done!");
                    resolve();
                }.bind(this))
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AssessmentEngine.prototype._engineRun = function(engine, gameSessionId, userId, gameId, eventsData, aInfo) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        // eventsData is an object or an array
        if( !eventsData ) {
            if(this.options.env == "dev") {
                console.log("AssessmentEngine: Execute Assessment - No Events - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
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
                console.log("AssessmentEngine: Execute Assessment - No Events - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
            }
            // nothing to process
            resolve();
            return;
        }
        console.log("AssessmentEngine: Processing - Engine:", engine, ", # Sessions:", eventsData.length);

        // saving current path to restore later
        var cDir = process.cwd();
        //console.log("Current Directory Before \""+engine+"\":", process.cwd());

        // check if engine path exists
        var path = "./lib/aeng/engines/"+engine;
        if( !fs.existsSync(path) ) {
            console.log("AssessmentEngine: Execute Assessment - No Engine Path - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
            // nothing to process
            resolve();
            return;
        }
        // change current dir to engine dir
        process.chdir( path );
        //console.log("Current Directory Inside \""+engine+"\":", process.cwd());

        if(this.options.env == "dev") {
            console.log("AssessmentEngine: Execute Assessment Started - gameSessionId:", gameSessionId, ", gameId:", gameId);
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
                    console.log( "AssessmentEngine: Saving Assessment...");

                    var out = {
                        timestamp: Util.GetTimeStamp(),
                        assessmentId:  aInfo.id,
                        engine:        engine,
                        gameSessionId: gameSessionId,
                        gameId:  gameId,
                        userId:  userId,
                        results: results
                    };
                    console.log( "AssessmentEngine: Assessment results:", out);
                    return this._saveAEResults(gameId, out);
                }
            }.bind(this))

            .then(function(){
                console.log("AssessmentEngine: Done Running - Engine:", engine);

                process.chdir( cDir );
                //console.log("Current Directory After \""+engine+"\":", process.cwd());

                resolve();
            }.bind(this))

            // catch all errors
            .then(null, function(err){
                console.log("AssessmentEngine: Assessment Execution - Error:", err);

                // nothing to do
                if(this.options.env == "dev") {
                    console.log("AssessmentEngine: Skipping Assessment Execution - gameSessionId:", gameSessionId, ", gameId:", gameId);
                }
                this.stats.increment("info", "ExecuteAssessment.Skipping");

                reject(err);
            }.bind(this));

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


AssessmentEngine.prototype._endQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/end", { id: id });
};

AssessmentEngine.prototype._cleanupQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/cleanup", { id: id });
};

AssessmentEngine.prototype._getSessionEvents = function(gameSessionId) {
    return this._internalTelemetryRequest("/int/v1/data/session/"+gameSessionId+"/events");
};

AssessmentEngine.prototype._getUserEvents = function(gameId, userId) {
    return this._internalTelemetryRequest("/int/v1/data/game/"+gameId+"/user/"+userId+"/events");
};


AssessmentEngine.prototype._getGameAssessmentDefinitions = function(gameId) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/assessment/definitions");
};

AssessmentEngine.prototype._saveAEResults = function(gameId, data) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/assessment/results", data);
};


// TODO: move this to core service routing
AssessmentEngine.prototype._internalTelemetryRequest = function(route, data) {
    var protocal = this.options.telemetry.protocal || 'http:';
    var host = this.options.telemetry.host || 'localhost';
    var port = this.options.telemetry.port || 8002;
    var url = protocal + "//" + host + ":" + port + route;

    return this.requestUtil.request(url, data);
};
