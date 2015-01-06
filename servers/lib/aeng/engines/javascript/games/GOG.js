/**
 * Game Over Gopher ShoutOut and WatchOut Module
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

module.exports = GOG_SoWo;

/*
 ** Source Document **
 GOG Shout Out, Watch Out - [link here]
*/

function GOG_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}


GOG_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = [ "FAILED_LEVEL", "COMPLETED_LEVEL", "PLACEMENT_DATA", "COMPLETED_BONUS_LEVEL" ];
    var filterEventKeys = [ "level", "attempts", "cornSilosPlaced", "iceLettuceCorrect", "melonsCorrect", "drillsCorrect", "wheatgrassPlaced", "carrotLaunchersPlaced", "beetTrapsPlaced", "garlicRaysPlaced", "crannonsPlaced" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo1.bind(this),
        this.wo2.bind(this),
        this.wo3.bind(this),
        this.wo4.bind(this),
        this.wo5.bind(this),
        this.wo6.bind(this),
        this.so1.bind(this),
        this.so2.bind(this),
        this.so3.bind(this),
        this.so4.bind(this)
    ]);
};

// ===============================================
// Struggling with Level
/*
 >= 3 failed levels

 FAILED_LEVEL
 */
GOG_SoWo.prototype.wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 3;
    var max = 3;
    sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"FAILED_LEVEL\" \
            GROUP BY gameLevel \
            ORDER BY COUNT(*) DESC \
            LIMIT 1";

    //console.log("wo1 sql:", sql);
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo1 DB Error:", err);
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
                    id:   "wo1",
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


// ===============================================
// No Corn Silos
/*
 >= 5 completed level and total corn silos placed = 0

 COMPLETED_LEVEL [ 'level' ]
 PLACEMENT_DATA [ 'cornSilosPlaced', 'level' ]
 */
GOG_SoWo.prototype.wo2 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as total FROM events AS ev \
                INNER JOIN \
                (SELECT gameSessionId FROM events \
                    WHERE \
                    eventName=\"COMPLETED_LEVEL\" AND \
                    eventData_Key=\"level\" AND \
                    CAST(eventData_Value as integer)<=5 \
                    ORDER BY \
                    serverTimeStamp DESC) AS gsid \
                ON ev.gameSessionId = gsid.gameSessionId \
                WHERE \
                eventName=\"PLACEMENT_DATA\" AND \
                (eventData_Key=\"cornSilosPlaced\" OR \
                eventData_Key=\"level\") \
                ORDER BY \
                serverTimeStamp DESC";

        //console.log("wo2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo2 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Add the totals together and be sure to check for level 5
            var completedLevel = false;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key == "level" ) {
                    if( results[i].total == "5" ) {
                        completedLevel = true;
                    }
                }
                else {
                    total += parseInt( results[i].total );
                }
            }

            // Check the final total
            if(completedLevel && total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo2",
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


// ===============================================
// No Iceberg Lettuce
/*
 >= 6 completed level and total ice lettuce correct = 0

 COMPLETED_LEVEL [ 'level' ]
 PLACEMENT_DATA [ 'iceLettuceCorrect', 'level' ]
 */
GOG_SoWo.prototype.wo3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as total FROM events AS ev \
                INNER JOIN \
                (SELECT gameSessionId FROM events \
                    WHERE \
                    eventName=\"COMPLETED_LEVEL\" AND \
                    eventData_Key=\"level\" AND \
                    CAST(eventData_Value as integer)<=6 \
                    ORDER BY \
                    serverTimeStamp DESC) AS gsid \
                ON ev.gameSessionId = gsid.gameSessionId \
                WHERE \
                eventName=\"PLACEMENT_DATA\" AND \
                (eventData_Key=\"iceLettuceCorrect\" OR \
                eventData_Key=\"level\") \
                ORDER BY \
                serverTimeStamp DESC";

        //console.log("wo3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo3 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Add the totals together and be sure to check for level 6
            var completedLevel = false;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key == "level" ) {
                    if( results[i].total == "6" ) {
                        completedLevel = true;
                    }
                }
                else {
                    total += parseInt( results[i].total );
                }
            }

            // Check the final total
            if(completedLevel && total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo3",
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


// ===============================================
// No Melon Strike
/*
 >= 8 completed level and total melons correct = 0

 COMPLETED_LEVEL [ 'level' ]
 PLACEMENT_DATA [ 'melonsCorrect', 'level' ]
 */
GOG_SoWo.prototype.wo4 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as total FROM events AS ev \
                INNER JOIN \
                (SELECT gameSessionId FROM events \
                    WHERE \
                    eventName=\"COMPLETED_LEVEL\" AND \
                    eventData_Key=\"level\" AND \
                    CAST(eventData_Value as integer)<=8 \
                    ORDER BY \
                    serverTimeStamp DESC) AS gsid \
                ON ev.gameSessionId = gsid.gameSessionId \
                WHERE \
                eventName=\"PLACEMENT_DATA\" AND \
                (eventData_Key=\"melonsCorrect\" OR \
                eventData_Key=\"level\") \
                ORDER BY \
                serverTimeStamp DESC";

        //console.log("wo4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo4 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Add the totals together and be sure to check for level 8
            var completedLevel = false;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key == "level" ) {
                    if( results[i].total == "8" ) {
                        completedLevel = true;
                    }
                }
                else {
                    total += parseInt( results[i].total );
                }
            }

            // Check the final total
            if(completedLevel && total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo4",
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


// ===============================================
// No Wheatgrass Blaster
/*
 >= 9 completed level and total wheat grass placed = 0

 COMPLETED_LEVEL [ 'level' ]
 PLACEMENT_DATA [ 'wheatgrassPlaced', 'level' ]
 */
GOG_SoWo.prototype.wo5 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as total FROM events AS ev \
                INNER JOIN \
                (SELECT gameSessionId FROM events \
                    WHERE \
                    eventName=\"COMPLETED_LEVEL\" AND \
                    eventData_Key=\"level\" AND \
                    CAST(eventData_Value as integer)<=9 \
                    ORDER BY \
                    serverTimeStamp DESC) AS gsid \
                ON ev.gameSessionId = gsid.gameSessionId \
                WHERE \
                eventName=\"PLACEMENT_DATA\" AND \
                (eventData_Key=\"wheatgrassPlaced\" OR \
                eventData_Key=\"level\") \
                ORDER BY \
                serverTimeStamp DESC";

        //console.log("wo5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo5 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Add the totals together and be sure to check for level 9
            var completedLevel = false;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key == "level" ) {
                    if( results[i].total == "9" ) {
                        completedLevel = true;
                    }
                }
                else {
                    total += parseInt( results[i].total );
                }
            }

            // Check the final total
            if(completedLevel && total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo5",
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


// ===============================================
// Struggling with Challenge Round
/*
 >= 10 completed bonus level attempts

 COMPLETED_BONUS_LEVEL [ 'attempts' ]
 */
GOG_SoWo.prototype.wo6 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"COMPLETED_BONUS_LEVEL\" AND \
                eventData_Key=\"attempts\" AND \
                CAST(eventData_Value as integer)>=10 \
                LIMIT 1";

        //console.log("wo6 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo wo6 DB Error:", err);
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
                        id:   "wo6",
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


// ===============================================
// Challenge Round Skill
/*
 <= 4 completed bonus level attempts

 COMPLETED_BONUS_LEVEL [ 'attempts' ]
 */
GOG_SoWo.prototype.so1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"COMPLETED_BONUS_LEVEL\" AND \
                eventData_Key=\"attempts\" AND \
                CAST(eventData_Value as integer)<=4 \
                LIMIT 1";

        //console.log("so1 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo so1 DB Error:", err);
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
                        id:   "so1",
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
// Tool Expert
/*
 player has used all tools

 PLACEMENT_DATA [ 'iceLettuceCorrect','melonsCorrect','drillsCorrect',
 'wheatgrassPlaced','carrotLaunchersPlaced','beetTrapsPlaced',
 'garlicRaysPlaced','crannonsPlaced','cornSilosPlaced' ]
 */
GOG_SoWo.prototype.so2 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 9;
        var max = 9;
        sql = "SELECT DISTINCT eventData_Key FROM events AS ev \
                INNER JOIN \
                (SELECT gameSessionId FROM events \
                    ORDER BY \
                    serverTimeStamp DESC ) AS gsid \
                ON ev.gameSessionId = gsid.gameSessionId \
                WHERE \
                eventName=\"PLACEMENT_DATA\" AND \
                eventData_Key IN (\"iceLettuceCorrect\",\"melonsCorrect\",\"drillsCorrect\",\"wheatgrassPlaced\",\"carrotLaunchersPlaced\",\"beetTrapsPlaced\",\"garlicRaysPlaced\",\"crannonsPlaced\",\"cornSilosPlaced\") AND \
                CAST(eventData_Value as integer)>=1 \
                ORDER BY \
                serverTimeStamp DESC";

        //console.log("so2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo so2 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            total = results.length;
            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "so2",
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
// Challenge Round Expert
/*
 >= 4 completed bonus level

 COMPLETED_BONUS_LEVEL [ 'level' ]
 */
GOG_SoWo.prototype.so3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"COMPLETED_BONUS_LEVEL\" AND \
                eventData_Key=\"level\" AND \
                CAST(eventData_Value as integer)>=4";

        //console.log("so3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo so3 DB Error:", err);
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
                        id:   "so3",
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
// Game Over Gopher Expert
/*
 >= 14 completed level

 COMPLETED_LEVEL [ 'level' ]
 */
GOG_SoWo.prototype.so4 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"COMPLETED_LEVEL\" AND \
                eventData_Key=\"level\" AND \
                CAST(eventData_Value as integer)>=14";

        //console.log("so4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - GOG_SoWo so4 DB Error:", err);
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
                        id:   "so4",
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