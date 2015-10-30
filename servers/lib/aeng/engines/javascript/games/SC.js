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

/*
 ** Source Document **
 SCE Shout Out, Watch Out - Tab[ Teacher/Learning (Tamas/Amy) ]
 https://docs.google.com/a/glasslabgames.org/spreadsheets/d/18U5X6BMFq6_LnjzJfU_G9tly8pwVW7Dgtn3CjAo5qrA/edit#gid=2088598735
*/

function SC_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}

SC_SoWo.prototype.getNumAttempts = function(userId, gameId, gameLevel) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this.aeService.getGameSessionInfo(userId, gameId)
        .then(function(gameSessionsInfo) {

            // calc attempts
            var numAttempts = 0;
            for (var i = 0; i < gameSessionsInfo.length; i++) {
                if ( gameSessionsInfo[i].gameLevel == gameLevel &&
                    gameSessionsInfo[i].state == "ended" ) {
                    numAttempts++;
                }
            }

            resolve(numAttempts);
        }.bind(this), reject);

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


// Name       -> gameLevel (ActivityId)
// Parktown   -> MedusaA1School01
// Alexandria -> MedusaA1Jobs01
// Sierra     -> MedusaA1Power01
// Jackson    -> MedusaA1Pollution01
SC_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = ["GL_Scenario_Summary", "GL_Zone", "GL_Unit_Bulldoze", "GL_Power_Warning", "GL_Failure" ];
    var filterEventKeys = ["busStops", "jobsScore", "type", "UGuid", "info" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
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
/*
 >= 10 bus stops present && mission_completed

 GL_Scenario_Summary[ 'busStops' ]
 */
SC_SoWo.prototype.park_wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 10;
    var max = 10;
    sql = "SELECT eventData_Value as total FROM events \
            WHERE \
            gameLevel=\"MedusaA1School01\" AND \
            eventName=\"GL_Scenario_Summary\" AND \
            eventData_Key=\"busStops\"\
            LIMIT 1";

    //console.log("park_wo1 sql:", sql);
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

        total = parseInt( results[0].total );
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
/*
 if( zone_res > 0) && mission_completed

 GL_Zone [ "type":"residential" ]
 */
SC_SoWo.prototype.park_so1 = function(db, userId) {
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
            eventData_Value=\"residential\"";

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
            this.engine.awardBadge(userId, 9);
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
/*
 <= 15 zones plopped && mission_completed

 GL_Zone [ "type":"industrial", "type":"commercial" ]
 */
SC_SoWo.prototype.alex_wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
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

        if(results.length) {
            total = results[0].total;
        }

        if( total <= max) {
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
/*
 commercial zone > industrial zone && jobs>900

 GL_Zone [ "type":"commercial" ], GL_Scenario_Summary [ 'jobsScore' ]
 */
SC_SoWo.prototype.alex_so1 = function(db, userId) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT com.total as comTotal, ind.total as indTotal, summary.jobs as jobs\
            FROM \
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
                eventData_Value=\"industrial\") ind, \
            (SELECT CAST(eventData_Value as integer) as jobs FROM events \
                WHERE \
                gameLevel=\"MedusaA1Jobs01\" AND \
                eventName=\"GL_Scenario_Summary\" AND \
                eventData_Key=\"jobsScore\" ) summary\
            WHERE \
                com.total > ind.total AND\
                summary.jobs > 900";

    //console.log("alex_so1 sql:", sql);
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SC_SoWo alex_so1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        total = results.length;

        if(total >= threshold) {
            this.engine.awardBadge(userId, 10);
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
/*
 attempt >= 2 && PowerWarning OR attempt >= 1 && Power Failure

 GL_Power_Warning[ 'type': 'Low Power' ], GL_Failure [ 'info': "Power Failure" ]
*/
SC_SoWo.prototype.sierra_wo1 = function(db, userId, gameId) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    var warnTotal = 0;
    var failTotal = 0;
    sql = "SELECT \
                warn.total as warnTotal, \
                fail.total as failTotal\
            FROM \
            ( SELECT COUNT(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Power01\" AND \
                eventName=\"GL_Power_Warning\" AND \
                eventData_Key=\"type\" AND \
                eventData_Value=\"Low Power\" \
            ) warn, \
            ( SELECT COUNT(*) as total FROM events \
                WHERE \
                gameLevel=\"MedusaA1Power01\" AND \
                eventName=\"GL_Failure\" AND \
                eventData_Key=\"info\" AND \
                eventData_Value=\"Power Failure\" \
            ) fail";

    // NOTE: db calls do NOT work inside of ajax requests like getNumAttempts below, so you have to run the Q before :/
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

        warnTotal = results[0].warnTotal;
        failTotal = results[0].failTotal;
    });

    this.getNumAttempts(userId, gameId, "MedusaA1Power01")
        .then(function(numAttempts){

            // no attempts
            if(!numAttempts) {
                // do nothing
                resolve();
                return;
            }

            if(numAttempts >= 2 && warnTotal) {
                total = numAttempts;
            }
            if(numAttempts >= 1 && failTotal) {
                total = numAttempts;
            }
            // if either then total >= 1

            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "sierra_wo1",
                        type: "watchout",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1),
                        data: {
                            warnTotal: warnTotal,
                            failTotal: failTotal
                        }
                    }
                );
            } else {
                // do nothing
                resolve();
            }

        }.bind(this), reject);

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

// Sierra     -> MedusaA1Power01
// Smog Destroyer
/*
 (Bulldoze one or more coal plants) && (no power outage or failure)

 GL_Unit_Bulldoze [ 'UGuid':"0x0f03c3ca", 'UGuid':"0xbfe4d762", 'UGuid':"Coal Power Plant", 'UGuid':"Dirty Coal Generator" ],
 AND
 GL_Power_Warning[ 'type': 'Low Power' ], GL_Failure [ 'info': "Power Failure" ]
 */
SC_SoWo.prototype.sierra_so1 = function(db, userId) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT bull.total as bullTotal, pow.total as powTotal FROM \
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
            ) pow  \
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
        console.log("sierra_so1 results:", results);

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        total = results[0].bullTotal;
        if(total >= threshold) {
            this.engine.awardBadge(userId, 27);
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
/*
 Zone residential (Zone_Res > 0 )

 GL_Zone [ "type":"residential" ]
 */
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
/*
 Bulldoze one or more coal plants && no power outage/failure

 GL_Unit_Bulldoze [ 'UGuid':"0x0f03c3ca", 'UGuid':"0xbfe4d762", 'UGuid':"Coal Power Plant", 'UGuid':"Dirty Coal Generator" ],

 GL_Power_Warning[ 'type': 'Low Power' ],GL_Failure [ 'info': "Power Failure" ]
 */
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