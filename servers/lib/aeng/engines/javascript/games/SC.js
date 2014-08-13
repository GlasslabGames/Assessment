/**
 * SimCity ShoutOut and WatchOut Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  sqlite3    - https://github.com/mapbox/node-sqlite3
 *
 */
// Third-party libs
var _       = require('lodash');
var when    = require('when');
var sqlite3 = require('sqlite3').verbose();

module.exports = SC_SoWo;

function SC_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}

// Name       -> gameLevel (ActivityId)
// Parktown   -> MedusaA1School01
// Alexandria -> MedusaA1Jobs01
// Sierra     -> MedusaA1Power01
// Jackson    -> MedusaA1Pollution01
/*
 /int/v1/data/session/game/:gameId/user/:userId/info
 */
SC_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = ["GL_Scenario_Summary", "GL_Zone", "GL_Unit_Bulldoze", "GL_Power_Warning", "GL_Failure" ];
    var filterEventKeys = ["busStops", "type", "UGuid", "info" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.park_wo1.bind(this),
        this.park_so1.bind(this),

        this.alex_wo1.bind(this),
        this.alex_so1.bind(this),

        this.sierra_wo1.bind(this),
        this.sierra_so1.bind(this),

        this.jack_wo1.bind(this),
        this.jack_so1.bind(this)
    ]);
};

// ===============================================
// Parktown   -> MedusaA1School01
// Crazy Plopper
SC_SoWo.prototype.park_wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 10;
    var max = 10;
    sql = "SELECT CAST(eventData_Value as \"INTEGER\") as total FROM events \
            WHERE \
            gameLevel=\"MedusaA1School01\" AND \
            eventName=\"GL_Scenario_Summary\" AND \
            eventData_Key=\"busStops\"\
            LIMIT 1";

    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo park_wo1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        total = results[0].total;
        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "park_wo1",
                    type: "watchout",
                    total: total,
                    overPercent: (total - threshold + 1)/(max - threshold + 1)
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// Parktown   -> MedusaA1School01
// Housing Mogul
SC_SoWo.prototype.park_so1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT count(*) as total FROM events \
            WHERE \
            gameLevel=\"MedusaA1School01\" AND \
            eventName=\"GL_Zone\" AND \
            eventData_Key=\"type\" AND \
            eventData_Value=\"residential\" \
            ORDER BY \
            serverTimeStamp DESC, gameSessionEventOrder DESC";

    //sql = "SELECT * FROM events";
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo park_so1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        total = results[0].total;
        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "park_so1",
                    type: "shoutout",
                    total: total,
                    overPercent: (total - threshold + 1)/(max - threshold + 1)
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
// ===============================================

// ===============================================
// Alexandria -> MedusaA1Jobs01
// NoZoner
SC_SoWo.prototype.alex_wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var max = 15;
    sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Jobs01\" AND \
                eventName=\"GL_Zone\" AND \
                eventData_Key=\"type\" AND \
                (eventData_Value=\"industrial\" OR\
                 eventData_Value=\"commercial\" )";

    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo alex_wo1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(results.length) {
            total = results[0].total;
        }

        if(total <= max) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id: "alex_wo1",
                    type: "watchout",
                    total: total,
                    underPercent: 1/(max - total + 1)
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// Alexandria -> MedusaA1Jobs01
// Industrial Champion
SC_SoWo.prototype.alex_so1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT com.total as comTotal, ind.total as indTotal, summary.jobs as jobs FROM \
            (SELECT COUNT(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Jobs01\" AND \
                eventName=\"GL_Zone\" AND \
                eventData_Key=\"type\" AND \
                eventData_Value=\"commercial\") com, \
            (SELECT COUNT(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Jobs01\" AND \
                eventName=\"GL_Zone\" AND \
                eventData_Key=\"type\" AND \
                eventData_Value=\"industrial\") ind,\
            (SELECT eventData_Value as jobs FROM events \
                WHERE \
                gameLevel=\"MedusaA1Jobs01\" AND \
                eventName=\"GL_Scenario_Summary\" AND \
                eventData_Key=\"jobsScore\" ) summary \
            WHERE \
                com.total > ind.total AND\
                summary.jobs > 900";

    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo alex_so1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        total = results.length;

        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "alex_so1",
                    type: "shoutout",
                    total: total,
                    overPercent: (total - threshold + 1)/(max - threshold + 1),
                    data: results
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
// ===============================================


// ===============================================
// Sierra     -> MedusaA1Power01
// Brown Out
//
// attempt >= 2 && PowerWarning OR attempt >= 1 && Power Failure
// GL_Power_Warning[ 'type': 'Low Power' ], GL_Failure [ 'info': "Power Failure" ]
SC_SoWo.prototype.sierra_wo1 = function(db, userId, gameId) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this.aeService.getGameSessionInfo(userId, gameId)
        .then(function(gameSessionsInfo){

            // calc attempts
            var numAttempts = 0;
            for(var i = 0; i < gameSessionsInfo.length; i++) {
                if( gameSessionsInfo[i].gameLevel == "MedusaA1Power01" &&
                    gameSessionsInfo[i].state     == "ended"
                  ) {
                    numAttempts++;
                }
            }

            var sql;
            var total = 0;
            var threshold = 1;
            var max = 1;
            sql = "SELECT count(*) total FROM \
                    ( SELECT COUNT(*) as total FROM events \
                        WHERE \
                        gameLevel=\"MedusaA1Power01\" AND \
                        eventName=\"GL_Power_Warning\" AND \
                        eventData_Key=\"type\" AND \
                        eventData_Value=\"Low Power\"\
                    ) warn, \
                    ( SELECT COUNT(*) as total FROM events \
                        WHERE \
                        gameLevel=\"MedusaA1Power01\" AND \
                        eventName=\"GL_Failure\" AND \
                        eventData_Key=\"info\" AND \
                        eventData_Value=\"Power Failure\"\
                    ) fail \
                    WHERE \
                       ("+numAttempts+" >= 2 AND warn.total > 0 ) OR \
                       ("+numAttempts+" >= 1 AND fail.total > 0 )";

            db.all(sql, function(err, results) {
                if(err) {
                    console.error("AssessmentEngine: Javascript_Engine - SC_SoWo sierra_wo1 DB Error:", err);
                    reject(err);
                    return;
                }

                // no results
                if(!results.length) {
                    // do nothing
                    resolve();
                    return;
                }

                total = results[0].total;
                if(total >= threshold) {
                    // over is 0 - 1 float percent of the amount past threshold over max
                    resolve(
                        {
                            id:   "sierra_wo1",
                            type: "watchout",
                            total: total,
                            overPercent: (total - threshold + 1)/(max - threshold + 1)
                        }
                    );
                } else {
                    // do nothing
                    resolve();
                }
            });

        }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// Sierra     -> MedusaA1Power01
// Smog Destroyer
SC_SoWo.prototype.sierra_so1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT bull.total as total FROM \
            (SELECT count(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Power01\" AND \
                eventName=\"GL_Unit_Bulldoze\" AND \
                eventData_Key=\"UGuid\" AND \
                (eventData_Value=\"0x0f03c3ca\" OR \
                 eventData_Value=\"0xbfe4d762\" OR \
                 eventData_Value=\"Coal Power Plant\" OR \
                 eventData_Value=\"Dirty Coal Generator\" ) \
            ) bull, \
            (SELECT count(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Power01\" AND \
                ( \
                  ( eventName=\"GL_Power_Warning\" AND \
                    eventData_Key=\"type\" AND \
                    eventData_Value=\"Low Power\" ) OR \
                  ( eventName=\"GL_Failure\" AND \
                    eventData_Key=\"info\" AND \
                    eventData_Value=\"Power Failure\" ) \
                ) \
            ) pow \
            WHERE \
            bull.total > 0 AND \
            pow.total = 0";

    //sql = "SELECT * FROM events";
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo sierra_so1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        total = results[0].total;
        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "sierra_so1",
                    type: "shoutout",
                    total: total,
                    overPercent: (total - threshold + 1)/(max - threshold + 1)
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
// ===============================================


// ===============================================
// Jackson    -> MedusaA1Pollution01
// Home Builder
SC_SoWo.prototype.jack_wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT count(*) as total FROM events \
        WHERE \
        gameLevel=\"MedusaA1Pollution01\" AND \
        eventName=\"GL_Zone\" AND \
        eventData_Key=\"type\" AND \
        eventData_Value=\"residential\"";

    //sql = "SELECT * FROM events";
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo jack_wo1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        total = results[0].total;
        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "jack_wo1",
                    type: "watchout",
                    total: total,
                    overPercent: (total - threshold + 1)/(max - threshold + 1)
                }
            );
        } else {
            // do nothing
            resolve();
        }
    });
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// Jackson    -> MedusaA1Pollution01
// Smog Destroyer
SC_SoWo.prototype.jack_so1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT bull.total as total FROM \
            (SELECT count(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Pollution01\" AND \
                eventName=\"GL_Unit_Bulldoze\" AND \
                eventData_Key=\"UGuid\" AND \
                (eventData_Value=\"0x0f03c3ca\" OR \
                 eventData_Value=\"0xbfe4d762\" OR \
                 eventData_Value=\"Coal Power Plant\" OR \
                 eventData_Value=\"Dirty Coal Generator\" ) \
            ) bull, \
            (SELECT count(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Pollution01\" AND \
                ( \
                  ( eventName=\"GL_Power_Warning\" AND \
                    eventData_Key=\"type\" AND \
                    eventData_Value=\"Low Power\" ) OR \
                  ( eventName=\"GL_Failure\" AND \
                    eventData_Key=\"info\" AND \
                    eventData_Value=\"Power Failure\" ) \
                ) \
            ) pow \
            WHERE \
            bull.total > 0 AND \
            pow.total = 0";

        //sql = "SELECT * FROM events";
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SC_SoWo jack_so1 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            total = results[0].total;
            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "jack_so1",
                        type: "shoutout",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1)
                    }
                );
            } else {
                // do nothing
                resolve();
            }
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

// ===============================================