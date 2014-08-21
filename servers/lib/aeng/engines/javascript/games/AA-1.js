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

/*
 ** Source Document **
 MGO - Watch Out, Shout Out (SOWO) - Tab[ mj_seth revisions ]
 https://docs.google.com/a/glasslabgames.org/spreadsheet/ccc?key=0AlWvbmmsDBgQdElyU0RZZUgtdklQcmwyMk1rX01VNlE&usp=drive_web#gid=4
*/

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
    var filterEventKeys = ["weakness", "success", "playerTurn"];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo_rule1.bind(this),
        this.wo_rule3.bind(this),

        this.so_rule1.bind(this)
    ]);

};

/*
 In Bot Equip: cores fused with inconsistent claim/evidence pair >=3 times (within last recent 6 tries)

 action variable is 'Fuse_core'' ; data variable is 'weakness: inconsistent"; 3-6 cases of inconsistent then watch out
*/
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
            if(row.eventData_Value != "none") {
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

/*
 "In all/any battles: Completed core attacks >=3
 In last 3 core attacks, success <=33%"

 action variable = "Launch_attack"; data variable = success: true (looking for 0 or 1 'true's)
 */
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

/*
 "Completed battle count >= 2;
 Last 3 Core Attacks successful by player

 Action = "Set_up_battle" >=2; AND action = "Launch_attack" (last three of these events are 'true') AND
 playerTurn = "true"
 */
AA_SoWo.prototype.so_rule1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 3;
        var max = 10;

        sql = "SELECT e.eventData_Value as attackSuccess \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as turn FROM events \
                    WHERE \
                        eventName=\"Launch_attack\" AND \
                        eventData_Key=\"playerTurn\" \
                    ) player \
                    ON player.eventId = e.eventId \
                WHERE \
                    e.eventName=\"Launch_attack\" AND \
                    e.eventData_Key=\"success\" AND \
                    (player.turn=\"true\" OR player.turn=\"1\") AND \
                    (SELECT COUNT(*) FROM events WHERE eventName=\"Set_up_battle\") >= 2 \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
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

            // manuely count success because we want to show failed
            //console.log("so_rule1 - results:", results);
            var total = _.reduce(results, function(total, row) {
                if( row.attackSuccess == "true" ||
                    row.attackSuccess == "1"
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
                        overPercent: (total - threshold + 1)/threshold
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
