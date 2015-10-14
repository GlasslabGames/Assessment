/**
 * Argument Wars ShoutOut and WatchOut Module
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

module.exports = AW_SoWo;

/*
 ** Source Document **
 AW-1 Shout Out, Watch Out - [link here]
*/

function AW_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;

    // Helper data object for determining scoring on telemetry events.
    this.caseRecodes = {
        "Bond v United States": {
            "PS1": 3,
            "PS2": 2,
            "PS3": 0,
            "PS4": 3,
            "PS5": 1,
            "PS6": 1,
            "PS7": 2,
            "PS8": 3,
            "PS9": 0,
            "PS10": 2,
            "PS11": 1,
            "DS1": 3,
            "DS2": 2,
            "DS3": 0,
            "DS4": 0,
            "DS5": 3,
            "DS6": 1,
            "DS7": 3,
            "DS8": 2,
            "DS9": 1,
            "DS10": 2,
            "DS11": 1
        },
        "New_Jersey_v_TLO": {
            "PS1": 2,
            "PS2": 3,
            "PS3": 3,
            "PS4": 2,
            "PS5": 3,
            "PS6": 0,
            "PS7": 1,
            "PS8": 1,
            "PS9": 0,
            "PS10": 1,
            "DS1": 2,
            "DS2": 2,
            "DS3": 3,
            "DS4": 2,
            "DS5": 3,
            "DS6": 0,
            "DS7": 1,
            "DS8": 0,
            "DS9": 1,
            "DS10": 1
        },
        "Brown_v_Board": {
            "PS1": 2,
            "PS2": 3,
            "PS3": 3,
            "PS4": 2,
            "PS5": 1,
            "PS6": 1,
            "PS7": 0,
            "PS8": 0,
            "PS9": 1,
            "PS10": 0
        },
        "Miranda_v_Arizona": {
            "PS1": 3,
            "PS2": 3,
            "PS3": 2,
            "PS4": 2,
            "PS5": 2,
            "PS6": 0,
            "PS7": 1,
            "PS8": 0,
            "PS9": 0,
            "PS10": 0,
            "DS1": 2,
            "DS2": 2,
            "DS3": 2,
            "DS4": 3,
            "DS5": 3,
            "DS6": 1,
            "DS7": 0,
            "DS8": 0,
            "DS9": 0,
            "DS10": 0
        }
    };
}


AW_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = [ "launch", "select", "turn_begin", "reason_end", "opprev", "object" ];
    var filterEventKeys = [ "case_name", "card_id", "success", "proponent" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo1.bind(this),
        this.wo2.bind(this),
        this.wo3.bind(this),
        this.wo4.bind(this),
        this.wo5.bind(this),
        this.so1.bind(this),
        this.so2.bind(this),
        this.so3.bind(this),
        this.so4.bind(this),
        this.so5.bind(this)
    ]);
};

// ===============================================
// ?
/*
 These players have chosen irrelevant support for their side of the case at least two times during the last case played.

 wo1
 */
AW_SoWo.prototype.wo1 = function(engine, db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT eventData_Key as key, eventData_Value as value FROM events \
            WHERE \
            (eventName=\"launch\" OR \
            eventName=\"select\") AND \
            (eventData_Key=\"case_name\" OR \
            eventData_Key=\"card_id\") \
            ORDER BY \
            serverTimeStamp ASC";

    // sql = 'SELECT eventData_Key as key, eventData_Value as value FROM events WHERE \
    //         (eventName="launch" OR eventName="select") \
    //         AND \
    //         (eventData_Key="case_name" OR eventData_Key="card_id") \
    //         ORDER BY serverTimeStamp ASC';

    //console.log("wo1 sql:", sql);
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - AW_SoWo wo1 DB Error:", err);
            reject(err);
            return;
        }

        // no results
        if(!results.length) {
            // do nothing
            resolve();
            return;
        }

        // Iterate through the card_ids and count the number of recodes that are less than 2
        var caseName = "";
        for( var i = 0; i < results.length; i++ ) {
            if( results[i].key === "case_name" ) {
                caseName = results[i].value;
            }
            else {
                var score = this.getCardRecode( caseName, results[i].value );
                if( score !== -1 && score < 2 ) {
                    total++;
                }
            }
        }

        if(total >= threshold) {
            // over is 0 - 1 float percent of the amount past threshold over max
            resolve(
                {
                    id:   "wo1",
                    type: "watchout",
                    total: total,
                    // overPercent: (total - threshold + 1)/(max - threshold + 1)
                    overPercent: (total - threshold)/(max)

                }
            );
if(0==(max - threshold + 1)) {
    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
    console.log('overPercent =', overPercent);
}
        } else {
            // do nothing
            resolve();
        }
    }.bind(this));
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


// ===============================================
// ?
/*
 These players did not choose Supreme Court precedent or Constitutional support in the first three moves of the last case played.

 wo2
 */
AW_SoWo.prototype.wo2 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as value FROM events \
            WHERE \
            (eventName=\"launch\" OR \
            eventName=\"select\" OR \
            eventName=\"turn_begin\") AND \
            (eventData_Key=\"case_name\" OR \
            eventData_Key=\"card_id\" OR \
            (eventData_Key=\"proponent\" AND \
            CAST(eventData_Value as integer)=1)) \
            ORDER BY \
            serverTimeStamp ASC";

        //console.log("wo2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo wo2 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Iterate through the card_ids and count the number of recodes that are less than 2
            var caseName = "";
            var numTurns = 0;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key === "case_name" ) {
                    caseName = results[i].value;
                }
                else if( results[i].key === "proponent" ) {
                    numTurns++;
                    if( numTurns > 3 ) {
                        break;
                    }
                }
                else {
                    var score = this.getCardRecode( caseName, results[i].value );
                    if( score !== -1 && score < 2 ) {
                        total++;
                    }
                }
            }

            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo2",
                        type: "watchout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
                if(0==(max - threshold + 1)) {
                    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
                    console.log('overPercent =', overPercent);
                }
            } else {
                // do nothing
                resolve();
            }
        }.bind(this));
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


// ===============================================
// ?
/*
 This player did not match the reasoning wheel sentence correctly at all during the last case played.

 wo3
 */
AW_SoWo.prototype.wo3 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Value as value FROM events \
            WHERE \
            eventName=\"reason_end\" AND \
            eventData_Key=\"success\"";

        //console.log("wo3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo wo3 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Iterate through the success values
            for( var i = 0; i < results.length; i++ ) {
                total += parseInt( results[i].value );
            }

            if(total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo3",
                        type: "watchout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
                if(0==(max - threshold + 1)) {
                    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
                    console.log('overPercent =', overPercent);
                }
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
// ?
/*
 The player has not reviewed any of the opponents cards in the last case played

 wo4
 */
AW_SoWo.prototype.wo4 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"opprev\" \
            LIMIT 1";

        //console.log("wo4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo wo4 DB Error:", err);
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
            if(total < threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo4",
                        type: "watchout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
                if(0==(max - threshold + 1)) {
                    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
                    console.log('overPercent =', overPercent);
                }
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
// ?
/*
 Player did not successfully object during the last case played.

 wo5
 */
AW_SoWo.prototype.wo5 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"object\" AND \
            eventData_Key=\"success\" AND \
            CAST(eventData_Value as integer)=0";

        //console.log("wo5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo wo4 DB Error:", err);
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
                        id:   "wo5",
                        type: "watchout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
                if(0==(max - threshold + 1)) {
                    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
                    console.log('overPercent =', overPercent);
                }
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
// ?
/*
 This player correctly matched all of the reasoning wheel sentences in the last case played.

 so1
 */
AW_SoWo.prototype.so1 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT eventData_Value as value FROM events \
            WHERE \
            eventName=\"reason_end\" AND \
            eventData_Key=\"success\"";

        //console.log("so1 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo so1 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Iterate through the success values
            for( var i = 0; i < results.length; i++ ) {
                total += results[i].value;
            }

            // Triggered if the number of successes equals the number of reason_end events found
// wcj -- ...  and 0 < events ... ?
            if(total >= results.length) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "so1",
                        type: "shoutout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

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
// ?
/*
 This player correctly objected to at least two of the other side's arguments in the last case played.

 so2
 */
AW_SoWo.prototype.so2 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 2;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"object\" AND \
            eventData_Key=\"success\" AND \
            CAST(eventData_Value as integer)=1";

        //console.log("so2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo so2 DB Error:", err);
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
                        id:   "so2",
                        type: "shoutout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

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
// ?
/*
 This player chose Supreme Court precedent or Constitutional support at least two times within the first four moves of the last case played, and chose no irrelevant support during the game.

 so3
 */
AW_SoWo.prototype.so3 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 2;
        var max = 1;
        sql = "SELECT eventData_Key as key, eventData_Value as value FROM events \
            WHERE \
            (eventName=\"launch\" OR \
            eventName=\"select\" OR \
            eventName=\"turn_begin\") AND \
            (eventData_Key=\"case_name\" OR \
            eventData_Key=\"card_id\" OR \
            (eventData_Key=\"proponent\" AND \
            CAST(eventData_Value as integer)=1)) \
            ORDER BY \
            serverTimeStamp ASC";

        //console.log("so3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo so3 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Iterate through the card_ids and count the number of recodes that are less than 2
            var caseName = "";
            var numTurns = 0;
            for( var i = 0; i < results.length; i++ ) {
                if( results[i].key === "case_name" ) {
                    caseName = results[i].value;
                }
                else if( results[i].key === "proponent" ) {
                    numTurns++;
                }
                else {
                    var score = this.getCardRecode( caseName, results[i].value );
                    if( score !== -1 ) {
                        if( score < 2 ) {
                            total = 0;
                            break;
                        }
                        else if( numTurns <= 4 ) {
                            total++;
                        }
                    }
                }
            }

            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "so3",
                        type: "shoutout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
            } else {
                // do nothing
                resolve();
            }
        }.bind(this));
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


// ===============================================
// ?
/*
 The player has reviewed all of the opponents cards in the last case played.

 so4
 */
AW_SoWo.prototype.so4 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"opprev\" \
            LIMIT 1";

        //console.log("so4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo so4 DB Error:", err);
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
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)
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
// ?
/*
 The player reviewed AND correctly passed or objected to all of the opponent's cards in the last case played. <Change: sum(opprev) >= 3 AND sum(success) >= 3 in each instance.

 so5
 */
AW_SoWo.prototype.so5 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT \
                (SELECT COUNT(*) FROM events \
                WHERE \
                eventName=\"object\" AND \
                eventData_Key=\"success\" AND \
                CAST(eventData_Value as integer)=1) as objectSuccessCount, \
                (SELECT COUNT(*) FROM events \
                WHERE \
                eventName=\"object\" AND \
                eventData_Key=\"success\" AND \
                CAST(eventData_Value as integer)=0) as objectFailCount, \
                (SELECT COUNT(*) FROM events \
                WHERE \
                eventName=\"opprev\") as opprevCount \
                FROM events";

        //console.log("so5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - AW_SoWo so5 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            total = ( results[0].objectSuccessCount >= 1 && ( results[0].objectSuccessCount == results[0].opprevCount ) && results[0].objectFailCount == 0 );
            total = total ? 1 : 0;
            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "so5",
                        type: "shoutout",
                        total: total,
                        // overPercent: (total - threshold + 1)/(max - threshold + 1)
                        overPercent: (total - threshold)/(max)

                    }
                );
                if(0==(max - threshold + 1)) {
                    console.warn('ZZZZNNNN==== found divide by zero in code .. ?!');
                    console.log('overPercent =', overPercent);
                }
            } else {
                // do nothing
                resolve();
            }
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


// Helper function for determining scoring on telemetry events.
AW_SoWo.prototype.getCardRecode = function( activity, cardId ) {
    if( activity && cardId ) {
        if( this.caseRecodes[ activity ] &&
            this.caseRecodes[ activity ][ cardId ] ) {
            return this.caseRecodes[ activity ][ cardId ];
        }
    }
    return -1;
};