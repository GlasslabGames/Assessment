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
var dirname = __dirname;
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
    Util       = require(dirname + '/../core/util.js');
    Assessment = require(dirname + '/assessment.js');

    this.options = _.merge(
        {
            assessment: {
                getMaxFromQueue:      20,
                checkQueueInterval:   1000,   // 1 second  in milliseconds
                checkActiveInterval:  300000, // 5 min in milliseconds
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

// TODO: make this async and possible get engines from DB
AssessmentEngine.prototype.loadEngines = function() {

    // loop thought all the engines
    try{
        //console.log("AssessmentEngine - loadEngines cwd:", process.cwd());
        var dir = dirname + "/engines";
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
                    this.engines[name] = new engine(this, edir, this.options);
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
    this.startTime(this.checkActivity, this.options.assessment.checkActiveInterval);
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
                if(this.options.env == "dev") {
                    console.log("AssessmentEngine: Activity Count:", activity.length);
                }

                // executes this "1" at a time
                var guardedAsyncOperation = guard(guard.n(1), function(activity){
                    return this.queue.pushJob("activity", {
                        userId: activity.userId,
                        gameId: activity.gameId,
                        gameSessionId: activity.gameSessionId
                    });
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
                    if(this.options.env == "dev") {
                        console.log("AssessmentEngine: Jobs Count:", count);
                    }
                    this.stats.increment("info", "GetIn.Count", count);

                    // creates zero filled array
                    count = Math.min(count, this.options.assessment.getMaxFromQueue);
                    var list = Array.apply(null, new Array(count)).map(Number.prototype.valueOf, 0);

                    // executes this "1" at a time
                    var guardedAsyncOperation = guard(guard.n(1), this.getJob.bind(this));

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
                if(this.options.env == "dev") {
                    console.log("AssessmentEngine: Start Job",
                        "- userId:", jobData.userId,
                        ", gameSessionId:", jobData.gameSessionId,
                        ", gameId:", jobData.gameId,
                        ", jobType:", jobData.jobType);
                }

                var p;
                if (data.jobType == "reprocess") {
                    var sinceTimestamp = data.since;
                    var courseId = data.courseId;
                    if (sinceTimestamp) {
                        p = this.reprocessSessionsSince(sinceTimestamp, data.gameId);
                    } else if (courseId) {
                        p = this.reprocessSessions(data.gameId, {
                            courseId: data.courseId
                        });
                    } else {
                        p = this.reprocessSessions(data.gameId, {
                            assessmentId: data.assessmentId,
                            onlyMissing: data.onlyMissing || false
                        });
                    }
                } else {
                    p = this.runAssessment(data.userId, data.gameId, data.gameSessionId, data.jobType);
                }

                return p
                    .then( function(){
                        // TODO: use assessment DS for queue
                        return this.endQSession(data.gameSessionId)
                    }.bind(this) );
            } else {
                // TODO: use assessment DS for queue
                return this.cleanupQSession(data.gameSessionId);
            }
        }.bind(this))

        // catch all ok
        .then( function(){
            /*
            console.log("AssessmentEngine: Job Done",
                "- userId:", jobData.userId,
                ", gameSessionId:", jobData.gameSessionId,
                ", gameId:", jobData.gameId,
                ", jobType:", jobData.jobType );
            */
        }.bind(this))

        // catch all errors
        .then(null, function(err) {
            console.error("AssessmentEngine: getJob - Error:", err);
            this.stats.increment("error", "getJob");
        }.bind(this));
};


AssessmentEngine.prototype.reprocessSessionsSince = function(earliestTimeStamp, gameId){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    this.getGameSessionsSince(earliestTimeStamp, gameId).then(function(sessions) {
        var promises = _.map(sessions, function(session) {
            return when.promise(function(resolve, reject) {
                if (session.userId && session.gameSessionId) {
                    var job = {
                        gameId: session.gameId,
                        userId: session.userId,
                        gameSessionId: session.gameSessionId,
                    };
                    resolve(job);
                }
            }.bind(this))
        }.bind(this));

        var gameTriggers = {};

        when.all(promises).then(function(promiseRows) {
            var gameIds = _.uniq(_.map(promiseRows, function(job) { return job.gameId; }));

            //lookup the games assessment triggers
            var aInfoPromises = _.map(gameIds, function(gameId) {
                return this.getGameAssessmentDefinitions(gameId).then(function(aInfos) {
                    gameTriggers[gameId] = _.uniq(_.map(aInfos, function (ai) { return ai.trigger; }));
                    resolve();
                })
            }.bind(this));
            when.all(aInfoPromises).then(function() {

                _.forEach(promiseRows, function(job) {
                    if (job) {
                        var triggers = gameTriggers[job.gameId];
                        _.forEach(triggers, function(trigger) {
                            this.queue.pushJob(trigger, job);
                        }.bind(this));
                    }
                }.bind(this))

            }.bind(this));
        }.bind(this));

    }.bind(this));
// ------------------------------------------------
}.bind(this));
};


AssessmentEngine.prototype.reprocessSessions = function(gameId, options){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    this.getLatestGameSessions(gameId, options.courseId).then(function(sessions) {
        var promises = _.map(sessions, function (session) {
            return when.promise(function(resolve, reject) {

                var job = {
                    gameId: gameId,
                    userId: session.userId,
                    gameSessionId: session.gameSessionId,
                };
                if (options.assessmentId && options.onlyMissing) {
                    job[options.assessmentId] = options.assessmentId;
                    this.getAssessmentResults(session.userId, gameId, options.assessmentId).then(
                        function(assessment) {
                            if (assessment.assessmentId) {
                                //assessment already exists
                                resolve();
                            } else {
                                //assessment missing
                                resolve(job)
                            }
                        }
                    )
                }
                else {
                    resolve(job);
                }

            }.bind(this));
        }.bind(this));

        when.all(promises).then(
            function(promiseRows) {
                _.forEach(promiseRows, function(job) {
                    if (job) {
                        this.queue.pushJob("activity", job);
                    }
                }.bind(this))
            }.bind(this)
        );
    }.bind(this));
// ------------------------------------------------
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

    this.getGameAssessmentDefinitions(gameId)
        .then(function(aInfo){
            //console.log("aInfo:", aInfo);

            var promiseList = [];
            var allEvents = null;
            var gameSessionEvents = null;
            var dataPromise, enginePromise;

            aInfo.forEach(function(ai) {

                //   aborts if gi:<gameId> -> assessment:[] is missing, empty, or
                //   lacks eg. { enabled: true, trigger: "endSession" }

                // if enabled and engine exists
                // and trigger matches jobType
                if( ai.enabled &&
                    ai.engine &&
                    ai.trigger == jobType) {
                    var engine = ai.engine.toLowerCase();

                    dataPromise = Util.PromiseContinue();
                    // return cached data or get data and pass it to the enginePromise
                    if( ai.dataProcessScope ) {
                        if( ai.dataProcessScope == "all" && !allEvents) {
                            dataPromise = this.getUserEvents(gameId, userId)
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
                            dataPromise = this.getGameSessionEvents(gameSessionId)
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
                            console.log("AssessmentEngine: Starting Running... - Engine:", engine);
                            return this._engineRun(engine, gameSessionId, userId, gameId, eventsData, jobType, ai);
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


AssessmentEngine.prototype._engineRun = function(engine, gameSessionId, userId, gameId, eventsData, jobType, aInfo) {
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

    // check if engine path exists
    var p = dirname + "/engines/" + engine;
    if( !fs.existsSync(p) ) {
        console.log("AssessmentEngine: Execute Assessment - No Engine Path - Engine:", engine, ", gameSessionId:", gameSessionId, ", gameId:", gameId);
        // nothing to process
        resolve();
        return;
    }

    console.log("AssessmentEngine: Execute Assessment Started",
        "- userId:", userId,
        ", gameSessionId:", gameSessionId,
        ", gameId:", gameId,
        ", jobType:", jobType,
        ", Engine:", engine,
        ", # Sessions:", eventsData.length);
    this.stats.increment("info", "ExecuteAssessment.Started");

    var enginePromise;
    if(this.engines[engine]) {
        // engine.js
        enginePromise = this.engines[engine].run(userId, gameId, gameSessionId, eventsData, aInfo);
    }
    else {
        enginePromise = Util.PromiseContinue();
    }

    enginePromise
        .then(function(assessmentResults){
            if(assessmentResults) {
                // get session info (userId, courseId)
                if (this.options.env == "dev") {
                    console.log("AssessmentEngine: Saving Assessment...",
                        "- userId:", userId,
                        ", gameSessionId:", gameSessionId,
                        ", gameId:", gameId,
                        ", jobType:", jobType,
                        ", Engine:", engine);
                }

                var out = {
                    engine:        engine,
                    gameSessionId: gameSessionId,
                    results:       assessmentResults
                };
                if (this.options.env == "dev") {
                  console.log("AssessmentEngine: Assessment results:", out);
                }

                return this.saveAEResults(userId, gameId, aInfo.id, out);
            }
        }.bind(this))

        .then(function(){
            console.log("AssessmentEngine: Done Running",
                "- userId:", userId,
                ", gameSessionId:", gameSessionId,
                ", gameId:", gameId,
                ", jobType:", jobType,
                ", Engine:", engine);


            resolve();
        }.bind(this))

        // catch all errors
        .then(null, function(err){
            console.error("AssessmentEngine: Assessment Execution - Error:", err);

            // nothing to do
            if(this.options.env == "dev") {
                console.log("AssessmentEngine: Skipping Assessment Execution",
                    "- userId:", userId,
                    ", gameSessionId:", gameSessionId,
                    ", gameId:", gameId,
                    ", jobType:", jobType,
                    ", Engine:", engine);
            }
            this.stats.increment("info", "ExecuteAssessment.Skipping");

            reject(err);
        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AssessmentEngine.prototype.endQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/end", { id: id });
};

AssessmentEngine.prototype.cleanupQSession = function(id) {
    return this._internalTelemetryRequest("/int/v1/data/qsession/cleanup", { id: id });
};

AssessmentEngine.prototype.getGameSessionEvents = function(gameSessionId) {
    return this._internalTelemetryRequest("/int/v1/data/session/"+gameSessionId+"/events");
};

AssessmentEngine.prototype.getGameSessionInfo = function(userId, gameId) {
    return this._internalTelemetryRequest("/int/v1/data/session/game/"+gameId+"/user/"+userId+"/info");
};


AssessmentEngine.prototype.getUserEvents = function(gameId, userId) {
    return this._internalTelemetryRequest("/int/v1/data/game/"+gameId+"/user/"+userId+"/events");
};

// this._games[gameId].info.assessment -- from CBdb -- from info.json ?
AssessmentEngine.prototype.getGameAssessmentDefinitions = function(gameId) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/assessment/definitions");
};

AssessmentEngine.prototype.getAssessmentResults = function(userId, gameId, assessmentId) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/user/"+userId+"/assessment/"+assessmentId+"/results");
};

AssessmentEngine.prototype.saveAEResults = function(userId, gameId, assessmentId, data) {
    return this._internalTelemetryRequest("/int/v1/dash/game/"+gameId+"/user/"+userId+"/assessment/"+assessmentId+"/results", data);
};

AssessmentEngine.prototype.getLatestGameSessions = function(gameId, courseId) {
    return this._internalTelemetryRequest('/int/v1/data/game/'+gameId+'/latestSessions'+(courseId ? "?courseId="+courseId:""));
};
AssessmentEngine.prototype.getGameSessionsSince = function(earliestTimeStamp, gameId) {
    return this._internalTelemetryRequest('/int/v1/data/game/sessionsSince/'+earliestTimeStamp+(gameId ? "?gameId="+gameId : ""));
};

// TODO: move this to core service routing
AssessmentEngine.prototype._internalTelemetryRequest = function(route, data) {
    var protocal = this.options.telemetry.protocal || 'http:';
    var host = this.options.telemetry.host || 'localhost';
    var port = this.options.telemetry.port || 8002;
    var url = protocal + "//" + host + ":" + port + route;

    return this.requestUtil.request(url, data);
};
