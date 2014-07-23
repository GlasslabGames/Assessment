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
var aeConst, Util;

module.exports = DistillerService;

function DistillerService(options){
    var Assessment;

    // Glasslab libs
    Util       = require('../core/util.js');
    Assessment = require('./assessment.js');
    aeConst    = Assessment.Const;

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
    this.AEFunc = {};
    console.log('DistillerService: Loading functions...');
    for(var f in Assessment.DistillerFunc) {
        console.log('DistillerService: Function "' + f + '" Loaded!');
        this.AEFunc[f] = new Assessment.DistillerFunc[f]();
    }

    this.wekaFileData = {};
    this.loadWekaFiles();

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

DistillerService.prototype.loadWekaFiles = function(){
    try{
        var dir = "./lib/aeng/engines/weka/bayes/";
        var files = fs.readdirSync(dir);

        files.forEach(function(file){
            // skip dot files
            if(file.charAt(0) != '.') {
                var name = path.basename(file, path.extname(file));
                this.wekaFileData[name] = fs.readFileSync(dir + file, 'utf-8');
            }
        }.bind(this));
    } catch(err) {
        console.error("DistillerService: Load Weka Files Error -", err);
    }

    console.log('DistillerService: Loaded Weka XML Files');
};


DistillerService.prototype.startTelemetryPoll = function(){
    // fetch assessment loop
    setInterval(function() {
        this.telemetryCheck();
    }.bind(this), this.options.distiller.pollDelay);
};


DistillerService.prototype.telemetryCheck = function(){
    this.queue.getJobCount()
        .then(
            function(count) {
                if(count > 0) {
                    console.log("DistillerService: telemetryCheck count:", count);
                    this.stats.increment("info", "GetIn.Count", count);

                    for(var i = 0; i < Math.min(count, this.options.distiller.getMax); i++){
                        this.getTelemetryBatch();
                    }
                }
            }.bind(this),
            function(err){
                console.log("DistillerService: telemetryCheck Error:", err);
                this.stats.increment("error", "TelemetryCheck.GetInCount");
            }.bind(this)
        );
};

DistillerService.prototype.getTelemetryBatch = function(){

    this.queue.popJob()
        // cleanup session
        .then(function(data){
            if(data.type == aeConst.queue.end) {
                return this.runAssessment(data.userId, data.id, data.gameId)
                    .then( function(){
                        // TODO: use assessment DS for queue
                        return this._endQSession(data.id)
                    }.bind(this) );
            } else {
                // TODO: use assessment DS for queue
                return this._cleanupQSession(data.id);
            }
        }.bind(this))

        // catch all ok
        .then( function(){
            //console.log("DistillerService: all done");
        }.bind(this))

        // catch all errors
        .then(null, function(err) {
            console.error("DistillerService: endBatchIn - Error:", err);
            this.stats.increment("error", "GetTelemetryBatch");
        }.bind(this));
};

// TODO, format console logs to be consistent
// session, game, engine, message
DistillerService.prototype.runAssessment = function(userId, gameSessionId, gameId){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    if( !gameId ||
        !gameId.length) {
        // default to using SimCity's
        gameId = 'sc';
    }
    gameId = gameId.toLowerCase(); // gameId is not case sensitive

    this._getGameAssessmentDefinitions(gameId)
        .then(function(aInfo){
            //console.log("aInfo:", aInfo);

            var promiseList = [];
            var allEvents = null;
            var gameSessionEvents = null;
            var dataPromise, enginePromise;

            aInfo.forEach(function(ai){
                if( ai.engine ) {
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
                            return this._engineRun(engine, gameSessionId, gameId, eventsData);
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


DistillerService.prototype._engineRun = function(engine, gameSessionId, gameId, eventsData) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        // eventsData is an object or an array
        if( !(eventsData) ) {
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

        var enginePromise;
        if(engine == "weka") {
            enginePromise = this._engine_runWeka(gameSessionId, gameId, eventsData);
        }
        else if(engine == "r") {
            enginePromise = this._engine_runR(gameSessionId, gameId, eventsData);
        }
        else {
            enginePromise = Util.PromiseContinue();
        }

        enginePromise
            .then(function(outData){
                console.log("DistillerService: Done Running - Engine:", engine);

                process.chdir( cDir );
                //console.log("Current Directory After \""+engine+"\":", process.cwd());

                return outData;
            }.bind(this))
            .then(resolve, reject);

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


// TODO
DistillerService.prototype._engine_runR = function(gameSessionId, gameId, data) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    resolve();

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


DistillerService.prototype._engine_runWeka = function(gameSessionId, gameId, data) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // check if gameId in function list, if not then don't run
    if(!this.AEFunc.hasOwnProperty(gameId) ){
        // nothing to do
        if(this.options.env == "dev") {
            console.log("DistillerService: Skipping Assessment Execution - gameSessionId:", gameSessionId, ", gameId:", gameId);
        }
        this.stats.increment("info", "ExecuteAssessment.Skipping");
        resolve();
        return;
    }

    if(this.options.env == "dev") {
        console.log("DistillerService: Execute Assessment Started - gameSessionId:", gameSessionId, ", gameId:", gameId);
    }

    this.stats.increment("info", "ExecuteAssessment.Started");

    try {
        // Run distiller function
        var distilledData = this.AEFunc[gameId].preProcess(data);
        //console.log( "Distilled data:", JSON.stringify(distilledData, null, 2) );

        // If the distilled data has no WEKA key, don't save anything
        if( !(distilledData && distilledData.bayes.key) ) {
            console.log( "DistillerService: No bayes key found in distilled data" );
            resolve();
            return;
        }
    } catch(err){
        console.trace("DistillerService: Execute Assessment Error -", err);
        this.stats.increment("error", "ExecuteAssessment.Running");
        reject(err);
        return;
    }

    //console.log("distilledData:", distilledData);
    // If the bayes key is empty, there is no WEKA to perform, resolve
    if( !distilledData || !distilledData.bayes.key ) {
        //console.log( "no bayes key found in weka data" );
        resolve();
        return;
    }

    // Set the command line string for the WEKA processor
    var commandString = " SimpleBayes";
    // weka files was not loaded
    if(!this.wekaFileData.hasOwnProperty(distilledData.bayes.key)) {
        console.error( "DistillerService: weka file missing from cache: ", distilledData.bayes.key);
        reject();
        return;
    }
    // add weka file length
    commandString += " " + this.wekaFileData[distilledData.bayes.key].length;

    // add root node
    commandString += " " + distilledData.bayes.root;

    // Use the distilled data to get the bayes key and evidence fragments to pass to the WEKA server
    var evidenceFragments = distilledData.bayes.fragments;
    for(var i in evidenceFragments) {
        commandString += " " + i + " " + evidenceFragments[i];
    }

    // Before we trigger the WEKA process, we need to make sure we set the current working directory
    // and execute the batch file or shell script, depending on the platform
    var scriptToExecute = '';
    //console.log( "Executing bayes on " + process.platform + " at " + process.cwd() );
    if( process.platform === "win32" ) {
        scriptToExecute += 'run_assessment.bat';
    } else {
        scriptToExecute += './run_assessment.sh';
    }

    // run child process in promise
    var runWekaPromise = when.promise( function(resolve2, reject2) {
        // Use the distilled data to get the bayes key and evidence fragments to pass to the WEKA process
        //console.log( "bayes file: ", distilledData.bayes.key );
        //console.log( "execute: ", scriptToExecute + commandString );

        var aeWeka = child_process.exec( scriptToExecute + commandString,
            function( error, data, stderr ) {
                //console.log( "weka data: ", data );
                //console.log( "stderr: ", stderr );
                if( error !== null ) {
                    //console.log( "exec error: " + error );
                    reject2( error );
                } else {
                    resolve2({distilled: distilledData, weka: data});
                }
            }.bind(this)
        );

        aeWeka.stdin.write(this.wekaFileData[distilledData.bayes.key]);
        aeWeka.stdin.end();
    }.bind(this));

    runWekaPromise
        .then(function(data) {
            // shortcut missing data
            if(!data) return;

            try {
                data.weka = JSON.parse(data.weka);
                // process wekaResults and distilled Data
                var compData = this.SD_Function.postProcess(data.distilled, data.weka);

                if(compData) {
                    // get session info (userId, courseId)
                    return this._getSessionInfo(gameSessionId)
                        .then(function(sessionInfo) {
                            if(sessionInfo) {
                                console.log( "DistillerService: Saving Assessment..." );

                                // TODO: save Competency Results to DB
                                //return this._saveCompetencyResults(sessionInfo, compData);
                            }
                        }.bind(this));
                }
            } catch(err) {
                // invalid json data
                console.error("DistillerService: Invalid Competency JSON data - Error:", err);
                reject(err);
            }
        }.bind(this))
        .then(function() {
            console.log( "DistillerService: Assessment Complete -", gameSessionId);
        }.bind(this))

        // catch all error
        .then(null, function(err){
            console.error("DistillerService: runAssessment - Error:", err);
            this.stats.increment("error", "GetTelemetryBatch");

            reject(err);
        }.bind(this));
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

DistillerService.prototype._endQSession = function(id) {
    return this._internalTelemetryRequest("post", "/int/v1/data/qsession/end", { id: id });
};

DistillerService.prototype._cleanupQSession = function(id) {
    return this._internalTelemetryRequest("post", "/int/v1/data/qsession/cleanup", { id: id });
};


DistillerService.prototype._getGameAssessmentDefinitions = function(gameId) {
    return this._internalTelemetryRequest("get", "/int/v1/dash/game/"+gameId+"/assessment/definitions");
};

DistillerService.prototype._getSessionEvents = function(gameSessionId){
    return this._internalTelemetryRequest("get", "/int/v1/data/session/"+gameSessionId+"/events");
};

DistillerService.prototype._getUserEvents = function(gameId, userId){
    return this._internalTelemetryRequest("get", "/int/v1/data/game/"+gameId+"/user/"+userId+"/events");
};


DistillerService.prototype._getSessionInfo = function(gameSessionId){
    return this._internalTelemetryRequest("get", "/int/v1/data/session/"+gameSessionId+"/info");
};

DistillerService.prototype._saveCompetencyResults = function(compData){
    return this._internalTelemetryRequest("post", "/int/v1/data/competencyResults", compData);
};


// TODO: move this to core service routeing
DistillerService.prototype._internalTelemetryRequest = function(type, route, data){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var protocal = this.options.telemetry.protocal || 'http:';
    var host = this.options.telemetry.host || 'localhost';
    var port = this.options.telemetry.port || 8002;
    var headers = {
        "Content-Type": "application/json"
    };

    var callback = function(err, res, rdata){
        if(err) {
            reject(err);
            return;
        }

        if(res.statusCode != 200) {
            reject(rdata);
        } else {
            try {
                var jdata = JSON.parse(rdata);
                resolve(jdata);
            } catch(err) {
                // invalid JSON
                reject(err);
            }
        }

    }.bind(this);

    var url = protocal+"//"+host+":"+port+route;
    if(type.toLowerCase() == "get") {
        this.requestUtil.getRequest(url, headers, callback);
    }
    else if(type.toLowerCase() == "post") {
        this.requestUtil.postRequest(url, headers, data, callback);
    }

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
