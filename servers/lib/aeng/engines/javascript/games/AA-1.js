/**
 * Argubot Academy ShoutOut and WatchOut Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  sqlite3    - https://github.com/mapbox/node-sqlite3
 *
 */
// Third-party libs
var _       = require('lodash');
var when    = require('when');
var sqlite3 = require('sqlite3').verbose();;

module.exports = AA_SoWo;

function AA_SoWo(engine, aeService, options) {
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}

/*
    Dump all the relivent events into an in memory SQLite DB
    Run some Q's and return results
 */
AA_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = ["Fuse_core", "Launch_attack", "Set_up_battle"];
    var filterEventKeys = ["weakness", "success"];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo_rule1.bind(this),
        this.wo_rule3.bind(this),

        this.so_rule1.bind(this)
    ]);

};

AA_SoWo.prototype.wo_rule1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var threshold = 3;
    var max = 6;
    sql = "SELECT * FROM events \
            WHERE \
            eventName=\"Fuse_core\" AND \
            eventData_Key=\"weakness\" \
            ORDER BY \
            serverTimeStamp DESC, gameSessionEventOrder DESC \
            LIMIT "+max;

    //sql = "SELECT * FROM events";
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - AA_SoWo wo_rule1 DB Error:", err);
            reject(err);
            return;
        }

        // to few to count
        if(results.length < max) {
            // do nothing
            resolve();
            return;
        }

        //console.log("wo_rule1 - results:", results);
        var total = _.reduce(results, function(total, row) {
            if(row.eventData_Value == "inconsistent") {
                return total + 1;
            } else {
                return total;
            }
        }, 0);

        //console.log("total:", total);
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

AA_SoWo.prototype.wo_rule3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 2;
        var max = 3;
        sql = "SELECT * FROM events \
        WHERE \
        eventName=\"Launch_attack\" AND \
        eventData_Key=\"success\" \
        ORDER BY \
        serverTimeStamp DESC, gameSessionEventOrder DESC \
        LIMIT "+max;

        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AA_SoWo wo_rule3 DB Error:", err);
                reject(err);
                return;
            }

            // to few to count
            if(results.length < max) {
                // do nothing
                resolve();
                return;
            }

            //console.log("wo_rule3 - results:", results);
            var total = _.reduce(results, function(total, row) {
                if( row.eventData_Value == "false" ||
                    row.eventData_Value == "0"
                    ) {
                    return total + 1;
                } else {
                    return total;
                }
            }, 0);

            //console.log("total:", total);
            if(total >= threshold) {
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

AA_SoWo.prototype.so_rule1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 3;
        var max = 3;
        sql = "SELECT * FROM events \
        WHERE \
        eventName=\"Launch_attack\" AND \
        eventData_Key=\"success\" AND \
        (SELECT COUNT(*) FROM events WHERE eventName=\"Set_up_battle\") >= 2 \
        ORDER BY \
        serverTimeStamp DESC, gameSessionEventOrder DESC \
        LIMIT "+max;

        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AA_SoWo so_rule1 DB Error:", err);
                reject(err);
                return;
            }

            // to few to count
            if(results.length < max) {
                // do nothing
                resolve();
                return;
            }

            //console.log("so_rule1 - results:", results);
            var total = _.reduce(results, function(total, row) {
                if( row.eventData_Value == "true" ||
                    row.eventData_Value == "1"
                    ) {
                    return total + 1;
                } else {
                    return total;
                }
            }, 0);

            //console.log("total:", total);
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
