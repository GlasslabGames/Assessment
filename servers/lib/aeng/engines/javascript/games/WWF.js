/**
 * WWF ShoutOut and WatchOut Module
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

module.exports = WWF_SoWo;

/*
 ** Source Document **
 WT Shout Out, Watch Out - https://docs.google.com/spreadsheets/d/1SCaDWDmzAvZ9VuOfnfiqikLkvOF2MNg6eD-mS_QjZJA/edit#gid=1680367254
 */

function WWF_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}


WWF_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {
    var filterEventTypes = [
        "DictionaryAccess", "WordPlay", "TurnStart", "TurnEnd", "GameStart", "GameEnd", "AcademicWordListView", "AWIC"
    ];
    var filterEventKeys = [
        "academic_words_looked_up", "academic_words_played", "current_TurnID", "current_gameID", "points_scored",
        "number_AWIC_correct", "outcome", "AWIC_status", "AWIC_answer", "double_definition_hints_used"
    ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo1.bind(this),
        this.wo4.bind(this),
        this.wo5.bind(this),
        this.wo10.bind(this),
        this.wo12.bind(this),
        this.wo14.bind(this),
        this.so2.bind(this),
        this.so5.bind(this),
        this.so6.bind(this),
        this.so7.bind(this),
        this.so8.bind(this),
        this.so9.bind(this),
        this.so10.bind(this),
        this.so11.bind(this),
        this.so12.bind(this),
        this.so13.bind(this),
        this.so14.bind(this),
        this.so15.bind(this)
    ]);
};

var debug = false;
var rpad = function(str, n) {
    n = n || 20;
    return ( str + Array(n+1).join(" ") ).slice(0, n);
};
var lpad = function(str, n) {
    n = n || 20;
    return ( Array(n+1).join(" ") + str ).slice(-n);
};
var exampleRow = {
    eventId: 160,
    userId: 16776,
    gameSessionId: '9eac9560-581b-11e5-b14a-35bfa82527a6',
    clientTimeStamp: 1441931150395,
    serverTimeStamp: 1441931153342,
    eventName: 'TurnStart',
    gameLevel: '-- TBD --',
    gameSessionEventOrder: 4,
    eventData_Key: 'current_gameID',
    eventData_Value: '16776/16591/1',
    target: ''
};

// ===============================================
// Player hasn't viewed academic word list in 3 turns
/*
 within 3 sequential:   Unit Start/End --> Unit Start --> Turn Start
                        Unit Start/End --> Unit End --> Turn End
 with sequental:        current_turn_id
 does NOT contain:      Player Action --> UI Use --> Academic Word List visited
 */
WWF_SoWo.prototype.wo1 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 3;
        var max = 10000;
        var lastId = "";
        var turnCount = 0;

        sql = 'SELECT eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, gameId, turnId \
                FROM (SELECT eventId, eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd", "AcademicWordListView") AND \
                        eventData_Key="current_gameID" \
                    ) current_gameID \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd", "AcademicWordListView") AND \
                        eventData_Key="current_TurnID" \
                    ) current_TurnID \
                    ON current_gameID.eventId = current_TurnID.eventId \
                GROUP BY\
                    gameId, turnId, eventName \
                ORDER BY \
                    gameId, serverTimeStamp, gameSessionEventOrder  \
                LIMIT '+max;

        debug && console.log("wo1 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo1 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo1 results[0]", results[0]);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            lastId = "";
            turnCount = 0;
            results.forEach(function(r) {
                if (lastId != r.gameId) {
                    lastId = r.gameId;
                    debug && console.log("\n-------start gameId-------", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }
                debug && console.log(r.gameSessionId + "\t" + (new Date(r.clientTimeStamp)).toString().slice(4,24)
                    +"  "+(new Date(r.serverTimeStamp)).toString().slice(4,24)
                    //+"  "+ r.gameSessionEventOrder+"\t"
                    +lpad(r.gameId)
                    +"   "+rpad(r.turnId)
                    + (r.eventName)
                );

                if (r.eventName === "AcademicWordListView") {
                    debug && console.log("-----turnCount reset-----", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }

                if (r.eventName === "TurnStart") {
                    turnCount++;
                    if (turnCount > threshold) {
                        debug && console.log("-------threshold exceeded-------", turnCount);
                    }
                }
            });
            if (turnCount > threshold) {
                total++;
                debug && console.log("------------------------last total++", total);
            }

            debug && console.log("-------------------------final total", total);

            if(total > 0) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo1",
                        type: "watchout",
                        total: total
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
// Student used a two Definition Hints ("word freebie") and then didn't play the Power Word from the hint
/*
 within 1:   Unit Start/End --> Unit Start --> Turn Start
             Unit Start/End --> Unit End --> Turn End
 if:         double_definition_hints_used = true             (this info is nested in Turn End event)
 and:        academic_words_played = NULL (no academic words played)  (this info is nested in Turn End event)
 */
WWF_SoWo.prototype.wo4 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 1;
        var max = 100;

        sql = 'SELECT count(*) as total \
                FROM (SELECT eventId, eventData_Value as DDHintUsed FROM events \
                    WHERE \
                        eventName="TurnEnd" AND \
                        eventData_Key="double_definition_hints_used" AND\
                        eventData_Value="true" \
                    ) double_definition_hints_used \
                LEFT JOIN (SELECT eventId, eventData_Value AS AWPlayed FROM events \
                    WHERE \
                        eventName="TurnEnd" AND \
                        eventData_Key="academic_words_played" \
                    ) academic_words_played \
                    ON double_definition_hints_used.eventId = academic_words_played.eventId \
                WHERE \
                    AWPlayed IS NULL OR AWPlayed = "" \
                LIMIT '+max;

        debug && console.log("wo4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo4 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo4 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var total = results[0].total;
            if (total > 0) {
                resolve({
                    id:   "wo4",
                    type: "watchout",
                    total: total
                });
            } else {
                resolve();
            }

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Player hasn’t played an Academic Word in 5 turns
/*
 updated every:                 Unit Start/End --> Unit Start --> Turn Start
 within 5 past sequential:   current_turn_id
 does NOT contain:           Player Action --> Grid Play --> Word Play --> [academic_words_played]: any
 */
WWF_SoWo.prototype.wo5 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 5;
        var max = 10000;
        var lastId = "";
        var turnCount = 0;

        sql = 'SELECT eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, gameId, turnId, IFNULL(AWPlayed,"") AS AWPlayed \
                FROM (SELECT eventId, eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd", "WordPlay") AND \
                        eventData_Key="current_gameID" \
                    ) current_gameID \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd", "WordPlay") AND \
                        eventData_Key="current_TurnID" \
                    ) current_TurnID \
                    ON current_gameID.eventId = current_TurnID.eventId \
                LEFT JOIN (SELECT eventId, eventData_Value as AWPlayed FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd", "WordPlay") AND \
                        eventData_Key="academic_words_played" \
                    ) academic_words_played \
                    ON current_gameID.eventId = academic_words_played.eventId     \
                     \
                GROUP BY\
                    gameId, turnId, eventName \
                ORDER BY \
                    gameId, serverTimeStamp, gameSessionEventOrder  \
                LIMIT '+max;

        debug && console.log("wo5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo5 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo5 results[0]", results[0]);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            lastId = "";
            turnCount = 0;
            results.forEach(function(r) {
                if (lastId != r.gameId) {
                    lastId = r.gameId;
                    debug && console.log("\n-------start gameId-------", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }
                debug && console.log(r.gameSessionId + "\t" + (new Date(r.clientTimeStamp)).toString().slice(4,24)
                    +"  "+(new Date(r.serverTimeStamp)).toString().slice(4,24)
                        //+"  "+ r.gameSessionEventOrder+"\t"
                    +lpad(r.gameId)
                    +"   "+rpad(r.turnId)
                    + rpad(r.eventName)
                    + (r.AWPlayed)
                );

                if (r.eventName === "WordPlay" && r.AWPlayed) {
                    debug && console.log("-----turnCount reset-----", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }

                if (r.eventName === "TurnStart") {
                    turnCount++;
                    if (turnCount > threshold) {
                        debug && console.log("-------threshold exceeded-------", turnCount);
                    }
                }
            });
            if (turnCount > threshold) {
                total++;
                debug && console.log("------------------------last total++", total);
            }

            debug && console.log("-------------------------final total", total);

            if(total > 0) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo5",
                        type: "watchout",
                        total: total
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
// On the same turn, the student looked up an Academic Word Bonus Word but still got the Academic Word Bonus wrong
/*
 within 1:                     Unit Start/End --> Unit Start --> Turn Start
                                Unit Start/End --> Unit End --> Turn End
 with same:                 current_turn_id
 contains both:            Player Action --> UI Use --> Dictionary Access --> [academic_words_looked_up]: any
                            Player Action --> Grid Play --> Word Play --> [academic_word_played]
 AND contains:  :         Player Action --> UI Use --> AWIC --> [AWIC_status:] fail
 */
WWF_SoWo.prototype.wo10 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var max = 10000;

        sql = 'SELECT gameId, turnId, AWLookedUp, AWIC_st \
                FROM (SELECT eventId, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName = "DictionaryAccess" AND \
                        eventData_Key = "current_gameID" \
                    ) DA_game \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName = "DictionaryAccess" AND \
                        eventData_Key = "current_TurnID" \
                    ) DA_turn \
                    ON DA_game.eventId = DA_turn.eventId\
                JOIN (SELECT eventId, eventData_Value as AWLookedUp FROM events \
                    WHERE \
                        eventName = "DictionaryAccess" AND \
                        eventData_Key = "academic_words_looked_up" AND\
                        AWLookedUp <> "--" \
                    ) DA_AWLU \
                    ON DA_turn.eventId = DA_AWLU.eventId \
                JOIN (SELECT eventId, eventData_Value as gameId2 FROM events \
                    WHERE \
                        eventName = "AWIC" AND \
                        eventData_Key = "current_gameID" \
                    ) AWIC_game \
                    ON gameId = gameId2 \
                JOIN (SELECT eventId, eventData_Value as turnId2 FROM events \
                    WHERE \
                        eventName = "AWIC" AND \
                        eventData_Key = "current_TurnID" \
                    ) AWIC_turn \
                    ON turnId = turnId2 \
                JOIN (SELECT eventId, eventData_Value as AWIC_st FROM events \
                    WHERE \
                        eventName = "AWIC" AND \
                        eventData_Key = "AWIC_status" AND \
                        AWIC_st = "fail"  \
                    ) AWIC_status \
                    ON AWIC_turn.eventId = AWIC_status.eventId \
                GROUP BY \
                    gameId, turnId, AWLookedUp, AWIC_st \
                LIMIT '+max;

        debug && console.log("wo10 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo10 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo10 results", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            total = results.length;
            if(total > 0) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo10",
                        type: "watchout",
                        total: total
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
// Student has started more than 6 games without finishing any of them.
/*
 	updated every:       Unit Start/End --> Unit End --> Game End
 totaling ZERO:       Unit Start/End --> Unit End --> Game End
 since (last 7):         Unit Start/End --> Unit Start --> Game Start
 with last 7 sequential: current_game_id
 */
WWF_SoWo.prototype.wo12 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 3;
        var max = 10000;
        var lastId = "";
        var gameCount = 0;

        sql = 'SELECT eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, gameId \
                FROM (SELECT eventId, eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName IN ("GameStart", "GameEnd") AND \
                        eventData_Key="current_gameID" \
                    ) current_gameID \
                 \
                GROUP BY\
                    gameId, eventName \
                ORDER BY \
                    serverTimeStamp, gameSessionEventOrder  \
                LIMIT '+max;

        debug && console.log("wo12 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo12 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo12 results", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            lastId = "";
            gameCount = 0;
            results.forEach(function(r) {
                debug && console.log(r.gameSessionId + "\t" + (new Date(r.clientTimeStamp)).toString().slice(4,24)
                    +"  "+(new Date(r.serverTimeStamp)).toString().slice(4,24)
                        //+"  "+ r.gameSessionEventOrder+"\t"
                    +lpad(r.gameId)+"   "

                    + (r.eventName)
                );

                if (r.eventName === "GameEnd") {
                    debug && console.log("-----gameCount reset-----", gameCount, "-> 0");
                    if (gameCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    gameCount = 0;
                }

                if (r.eventName === "GameStart") {
                    gameCount++;
                    if (gameCount > threshold) {
                        debug && console.log("-------threshold exceeded-------", gameCount);
                    }
                }
            });
            if (gameCount > threshold) {
                total++;
                debug && console.log("------------------------last total++", total);
            }

            debug && console.log("-------------------------final total", total);

            if(total > 0) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo12",
                        type: "watchout",
                        total: total
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
// Streak of 5 turns on which student didn't play a word (so they either passed or swapped)
/*
 	updated every:                     Unit Start/End --> Unit End --> Turn End
 since (last 5):                       Unit Start/End --> Unit Start --> Turn End
 with last 5 sequential:           current_turn_id
 in which every one contains:  Unit Start/End --> Unit Start --> Turn End --> [outcome]: resign, pass, or swap
 */
WWF_SoWo.prototype.wo14 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 5;
        var max = 10000;
        var lastId = "";
        var turnCount = 0;


        sql = 'SELECT eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, gameId, turnId, IFNULL(turnOutcome,"") as turnOutcome \
                FROM (SELECT eventId, eventName, gameSessionId, gameSessionEventOrder, clientTimeStamp, serverTimeStamp, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd") AND \
                        eventData_Key="current_gameID" \
                    ) current_gameID \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName IN ("TurnStart", "TurnEnd") AND \
                        eventData_Key="current_TurnID" \
                    ) current_TurnID \
                    ON current_gameID.eventId = current_TurnID.eventId\
                LEFT JOIN (SELECT eventId, eventData_Value as turnOutcome FROM events \
                    WHERE \
                        /*eventName IN ("TurnStart", "TurnEnd") AND*/ \
                        eventData_Key="outcome" \
                    ) outcome \
                    ON current_gameID.eventId = outcome.eventId \
                    \
                GROUP BY\
                    gameId, turnId, eventName, turnOutcome \
                ORDER BY \
                    gameId, serverTimeStamp, gameSessionEventOrder  \
                LIMIT '+max;


        debug && console.log("wo14 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo wo14 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("wo14 results", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            lastId = "";
            turnCount = 0;
            results.forEach(function(r) {
                if (lastId != r.gameId) {
                    lastId = r.gameId;
                    debug && console.log("\n-------start gameId-------", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }
                debug && console.log(r.gameSessionId + "\t" + (new Date(r.clientTimeStamp)).toString().slice(4,24)
                    +"  "+(new Date(r.serverTimeStamp)).toString().slice(4,24)
                        //+"  "+ r.gameSessionEventOrder+"\t"
                    +lpad(r.gameId)
                    +"   "+rpad(r.turnId)
                    + rpad(r.eventName)
                    + (r.turnOutcome)
                );

                if (r.eventName === "TurnEnd" && !(r.turnOutcome === "resign" || r.turnOutcome === "pass" || r.turnOutcome === "swap") ) {
                    debug && console.log("-----turnCount reset-----", turnCount, "-> 0");
                    if (turnCount > threshold) {
                        total++;
                        debug && console.log("---------------------------- total++", total);
                    }
                    turnCount = 0;
                }

                if (r.eventName === "TurnStart") {
                    turnCount++;
                    if (turnCount > threshold) {
                        debug && console.log("-------threshold exceeded-------", turnCount);
                    }
                }
            });
            if (turnCount > threshold) {
                total++;
                debug && console.log("------------------------last total++", total);
            }

            debug && console.log("-------------------------final total", total);

            if(total > 0) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve(
                    {
                        id:   "wo14",
                        type: "watchout",
                        total: total
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
// Student has looked up 8 or more academic words in a game
/*
 within 1:          "Unit Start/End --> Unit Start --> Game Start"
                    "Unit Start/End --> Unit End --> Game End"
 with same:         "current_game_id"
 contains 8:        "Player Action --> UI Use --> Dictionary Access --> [academic_words_looked_up]: any"
 */
WWF_SoWo.prototype.so2 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 8;
        var max = 16;

        sql = 'SELECT gameId, COUNT(e.eventData_Value) as numAcademicWordsLookedUp \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName="DictionaryAccess" AND \
                        eventData_Key="current_gameID" \
                    ) game \
                    ON game.eventId = e.eventId \
                    \
                WHERE \
                    e.eventName="DictionaryAccess" AND \
                    e.eventData_Key="academic_words_looked_up" AND \
                    e.eventData_Value <> "--" AND \
                    e.eventData_Value <> "" \
                GROUP BY 1 \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
                LIMIT '+max;

        debug && console.log("so2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so2 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var numAcademicWordsLookedUp = results[0].numAcademicWordsLookedUp;
            if(numAcademicWordsLookedUp >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                var out = {
                    id:   "so2",
                    type: "shoutout",
                    total: numAcademicWordsLookedUp,
                    overPercent: (numAcademicWordsLookedUp - threshold + 1)/(max - threshold + 1)
                };
                resolve(out);
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
// Played more than 5 Academic Words in a game
/*
 within 1:          "Unit Start/End --> Unit Start --> Game Start"
                    "Unit Start/End --> Unit End --> Game End"
 with same:         "current_game_id"
 contains 5:        "Player Action --> Grid Play --> Word Play --> [academic_words_played]: any"
 */
WWF_SoWo.prototype.so5 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 5;
        var max = 16;

        sql = 'SELECT gameId, COUNT(e.eventData_Value) as numAcademicWordsPlayed \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_gameID" \
                    ) game \
                    ON game.eventId = e.eventId \
                    \
                WHERE \
                    e.eventName="WordPlay" AND \
                    e.eventData_Key="academic_words_played" AND \
                    e.eventData_Value <> "--" AND \
                    e.eventData_Value <> "" \
                GROUP BY 1 \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
                LIMIT '+max;

        debug && console.log("so5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so5 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var numAcademicWordsPlayed = results[0].numAcademicWordsPlayed;
            if(numAcademicWordsPlayed >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                var out = {
                    id:   "so5",
                    type: "shoutout",
                    total: numAcademicWordsPlayed,
                    overPercent: (numAcademicWordsPlayed - threshold + 1)/(max - threshold + 1)
                };
                resolve(out);
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
// Streak of 3 Academic Words played (in a row during one game)
/*
 within 1:          "Unit Start/End --> Unit Start --> Game Start"
                    "Unit Start/End --> Unit End --> Game End"
 with same:         "current_game_id"
 contains 3:        "Player Action --> Grid Play --> Word Play --> [academic_words_played]: any"
 with sequential:   "current_turn_id"
 */
WWF_SoWo.prototype.so6 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 3;
        var max = 100;
        var streak = 0;
        var currentGameId = "", currentTurnId = "";

        sql = 'SELECT gameId, turnId, COUNT(e.eventData_Value) as numAcademicWordsPlayed \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_gameID" \
                    ) game \
                    ON game.eventId = e.eventId \
                    \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_TurnID" \
                    ) turn \
                    ON turn.eventId = e.eventId \
                    \
                WHERE \
                    e.eventName="WordPlay" AND \
                    e.eventData_Key="academic_words_played" AND \
                    e.eventData_Value <> "--" AND \
                    e.eventData_Value <> "" \
                GROUP BY 1, 2 \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
                LIMIT '+max;

        debug && console.log("so6 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so6 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so6 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            if (results.some(function(result) {
                    var numAcademicWordsPlayed = parseInt(result.numAcademicWordsPlayed, 10);
                    var gameId = result.gameId;

                    if (gameId != currentGameId) {
                        currentGameId = gameId;
                        streak = 0;
                    }

                    if (numAcademicWordsPlayed == 0) {
                        streak = 0;
                    } else {
                        streak += numAcademicWordsPlayed;
                    }

                    return streak >= threshold;
            })) {


                var out = {
                    id:   "so6",
                    type: "shoutout",
                    total: 1,
                    overPercent: 0
                };
                resolve(out);
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
// Played two Academic Words during one turn
/*
 within 1:          "Unit Start/End --> Unit Start --> Turn Start"
                    "Unit Start/End --> Unit End --> Turn End"
 with same:         "current_turn_id"
 contains 2:        "Player Action --> Grid Play --> Word Play --> [academic_words_played]: any"
 */
WWF_SoWo.prototype.so7 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 2;
        var max = 16;

        sql = 'SELECT turnId, COUNT(e.eventData_Value) as numAcademicWordsPlayed \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_TurnID" \
                    ) turn \
                    ON turn.eventId = e.eventId \
                    \
                WHERE \
                    e.eventName="WordPlay" AND \
                    e.eventData_Key="academic_words_played" AND \
                    e.eventData_Value <> "--" AND \
                    e.eventData_Value <> "" \
                GROUP BY 1 \
                HAVING \
                    numAcademicWordsPlayed >= '+threshold+' \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
                LIMIT '+max;

        debug && console.log("so7 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so7 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so7 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var out = {
                id:   "so7",
                type: "shoutout",
                total: results.length
            };
            resolve(out);
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};


// ===============================================
// Student played 50 Power Words
/*
 updated every:             Unit Start/End --> Unit End --> Game End
 total # of:                Player Action --> Grid Play --> Word Play --> [academic_words_played]: any
 since (very 1st word):     GlassLab Dash --> Learning Event --> Student played first AW
 */
WWF_SoWo.prototype.so8 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 50;
        var max = 50;
        sql = 'SELECT COUNT(*) as total FROM events \
                WHERE \
                    eventName="WordPlay" AND \
                    eventData_Key="academic_words_played" AND \
                    eventData_Value <> "" \
                \
                LIMIT '+max;

        debug && console.log("so8 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so8 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so8 results:", results);
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
                        id:   "so8",
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
// Student played 100 of Power Words
/*
 updated every:             Unit Start/End --> Unit End --> Game End
 total # of:                Player Action --> Grid Play --> Word Play --> [academic_words_played]: any
 since (very 1st word):     GlassLab Dash --> Learning Event --> Student played first AW
 */
WWF_SoWo.prototype.so9 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 100;
        var max = 100;
        sql = 'SELECT COUNT(*) as total FROM events \
                WHERE \
                    eventName="WordPlay" AND \
                    eventData_Key="academic_words_played" AND \
                    eventData_Value <> "" \
                \
                LIMIT '+max;

        debug && console.log("so9 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so9 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so9 results:", results);
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




// ===============================================
// On the same turn, the student looked up an Academic Word Bonus Word AND got the Academic Word Bonus
/*
 within 1:              Unit Start/End --> Unit Start --> Turn Start
                        Unit Start/End --> Unit End --> Turn End
 with same:             current_turn_id
 contains both:         Player Action --> Grid Play --> Word Play --> [number_AWIC_correct]: 1 or more
                        Player Action --> UI Use --> Dictionary Access --> [academic_words_looked_up]: any
 with SAME value in:    words_played and words_looked_up, respectively
 */
WWF_SoWo.prototype.so10 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var max = 1;

        sql = 'SELECT DISTINCT turnId, e.eventData_Value as academicWordPlayed, academicWordLookedUp, numAWIC \
                FROM events as e \
                JOIN (SELECT eventId, eventData_Value as turnId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_TurnID" \
                    ) turn \
                    ON turn.eventId = e.eventId \
                    \
                JOIN (SELECT eventId, CAST(eventData_Value AS INTEGER) as numAWIC FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="number_AWIC_correct" \
                    ) number_AWIC_correct \
                    ON number_AWIC_correct.eventId = e.eventId \
                    \
                JOIN (SELECT eventId, eventData_Value as turnId2 FROM events \
                    WHERE \
                        eventName="DictionaryAccess" AND \
                        eventData_Key="current_TurnID" \
                    ) turn2 \
                    ON turnId = turnId2 \
                    \
                JOIN (SELECT eventId, eventData_Value as academicWordLookedUp FROM events \
                    WHERE \
                        eventName="DictionaryAccess" AND \
                        eventData_Key="academic_words_looked_up" \
                    ) e2 \
                    ON turn2.eventId = e2.eventId \
                    \
                WHERE \
                    e.eventName="WordPlay" AND \
                    e.eventData_Key="academic_words_played" AND \
                    e.eventData_Value <> "--" AND \
                    e.eventData_Value <> "" AND \
                    academicWordPlayed = academicWordLookedUp AND \
                    numAWIC > 0 \
                ORDER BY \
                    e.serverTimeStamp DESC, e.gameSessionEventOrder DESC \
                LIMIT '+max;

        debug && console.log("so10 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so10 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so10 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var out = {
                id:   "so10",
                type: "shoutout",
                total: 1,
                overPercent: 0
            };
            resolve(out);

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Earned 3 or more Academic Word Bonuses in one game
/*
 within 1:              Unit Start/End --> Unit Start --> Game Start
                        Unit Start/End --> Unit End --> Game End
 with same:             current_game_id
 contains 3 or more:    Player Action --> Grid Play --> Word Play --> [number_AWIC_correct]: 1
 */
WWF_SoWo.prototype.so11 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 3;
        var max = 16;

        sql = 'SELECT gameId, SUM(numAWIC) as totalBonusAWIC \
                FROM (SELECT eventId, CAST(eventData_Value AS INTEGER) as numAWIC FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="number_AWIC_correct" \
                    ) number_AWIC_correct \
                JOIN (SELECT eventId, eventData_Value as gameId FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="current_gameID" \
                    ) current_gameID \
                    ON current_gameID.eventId = number_AWIC_correct.eventId \
                    \
                GROUP BY 1 HAVING totalBonusAWIC >= '+threshold+'\
                LIMIT '+max;

        debug && console.log("so11 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so11 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so11 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var totalBonusAWIC = results[0].totalBonusAWIC;
            var out = {
                id:   "so11",
                type: "shoutout",
                total: totalBonusAWIC,
                overPercent: (totalBonusAWIC - threshold + 1)/(max - threshold + 1)
            };
            resolve(out);

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Won 4 games (cumulatively, not neccessarily in a row)
/*
 updated every:           Unit Start/End --> Unit End --> Game End
 totaling 4:                  Unit Start/End --> Unit End --> Game End --> [outcome]: win 
 since (very 1st):         Unit Start/End --> Unit Start --> Game Start
 */
WWF_SoWo.prototype.so12 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 4;

        sql = 'SELECT COUNT(*) as total \
                FROM events \
                WHERE \
                    eventName="GameEnd" AND \
                    eventData_Key="outcome" AND \
                    eventData_Value="win" \
                ';

        debug && console.log("so12 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so12 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so12 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var total = results[0].total;
            if (total > threshold) {
                resolve({
                    id:   "so12",
                    type: "shoutout",
                    total: total
                });
            } else {
                resolve();
            }

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Student completed 10 games
/*
 updated every:           Unit Start/End --> Unit End --> Game End
 totaling 10:                  Unit Start/End --> Unit End --> Game End
 since (very 1st):         Unit Start/End --> Unit Start --> Game Start
 */
WWF_SoWo.prototype.so13 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 10;

        sql = 'SELECT COUNT(DISTINCT eventData_Value) as total FROM events \
                WHERE \
                    eventName="GameEnd" AND \
                    eventData_Key="current_gameID" \
                ';

        debug && console.log("so13 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so13 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so13 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var total = results[0].total;
            if (total > threshold) {
                resolve({
                    id:   "so13",
                    type: "shoutout",
                    total: total
                });
            } else {
                resolve();
            }

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Student completed 50 games
/*
 updated every:           Unit Start/End --> Unit End --> Game End
 totaling 50:                  Unit Start/End --> Unit End --> Game End
 since (very 1st):         Unit Start/End --> Unit Start --> Game Start
 */
WWF_SoWo.prototype.so14 = function(engine, db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 50;

        sql = 'SELECT COUNT(DISTINCT eventData_Value) as total FROM events \
                WHERE \
                    eventName="GameEnd" AND \
                    eventData_Key="current_gameID" \
                ';

        debug && console.log("so14 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so14 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so14 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var total = results[0].total;
            if (total > threshold) {
                resolve({
                    id:   "so14",
                    type: "shoutout",
                    total: total
                });
            } else {
                resolve();
            }

        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};



// ===============================================
// Played a word worth more than 50 points
/*
 updated every:                     Player Action --> Grid Play --> Word Play
 single event exceeding 50 points:  Player Action --> Grid Play --> Word Play --> [points_scored]: 51+
 */
WWF_SoWo.prototype.so15 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var threshold = 50;
        var max = 50;

        sql = 'SELECT COUNT(*) as total \
                FROM (SELECT eventId, CAST(eventData_Value AS INTEGER) as pointsScored FROM events \
                    WHERE \
                        eventName="WordPlay" AND \
                        eventData_Key="points_scored" AND \
                        pointsScored > '+threshold+' \
                    ) points_scored \
                LIMIT '+max;

        debug && console.log("so15 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WWF_SoWo so15 DB Error:", err);
                reject(err);
                return;
            }
            debug && console.log("so15 results:", results);

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            var total = results[0].total;
            if (total > 0) {
                resolve({
                    id:   "so15",
                    type: "shoutout",
                    total: total
                });
            } else {
                resolve();
            }
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};
