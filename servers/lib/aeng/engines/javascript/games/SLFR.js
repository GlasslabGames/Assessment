/**
 * Slice Fractions ShoutOut and WatchOut Module
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

module.exports = SLFR_SoWo;

/*
 ** Source Document **
 SLFR Shout Out, Watch Out - [link here]
*/

function SLFR_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}


SLFR_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = [ "onLevelCompleted", "onLevelNotCompleted" ];
    var filterEventKeys = [ "levelID", "retryCount" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo1.bind(this),
        this.wo2.bind(this),
        this.wo3.bind(this),
        this.wo4.bind(this),
        this.wo5.bind(this),
        this.wo6.bind(this),
        this.wo7.bind(this),
        this.wo8.bind(this),
        this.wo9.bind(this),
        this.wo10.bind(this),
        this.wo11.bind(this),
        this.wo12.bind(this),
        this.wo13.bind(this),
        this.wo14.bind(this),
        this.wo15.bind(this),
        this.so1.bind(this)
    ]);
};

// ===============================================
// How to Play concept - retrying a level often
/*
 A level from the How to play concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has
 a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
            (SELECT * FROM events \
            WHERE eventData_Key=\"retryCount\") as part1 \
            JOIN \
            (SELECT * FROM events \
            WHERE eventData_Key=\"levelID\") as part2 \
            ON part1.eventId = part2.eventId \
            WHERE \
            (level=\"FunMammothIntro\" AND CAST(retry as integer)>=1) OR \
            (level=\"FunBridge\" AND CAST(retry as integer)>=1) OR \
            (level=\"FunVolcanoEruption\" AND CAST(retry as integer)>=1) OR \
            (level=\"FunBubblesTutorial\" AND CAST(retry as integer)>=4) OR \
            (level=\"SFFSFunRopesTutorial\" AND CAST(retry as integer)>=5)";

    //console.log("wo1 sql:", sql);
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo1 DB Error:", err);
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
// Split Groups concept - retrying a level often
/*
 A level from the Split Groups concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has
 a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo2 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"SFFSSplitGroups1\" AND CAST(retry as integer)>=3) OR \
                (level=\"SplitGroups2\" AND CAST(retry as integer)>=5) OR \
                (level=\"SplitGroups3\" AND CAST(retry as integer)>=4) OR \
                (level=\"SplitGroups4\" AND CAST(retry as integer)>=6) OR \
                (level=\"RewardSplitGroups\" AND CAST(retry as integer)>=1)";

        //console.log("wo2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo2 DB Error:", err);
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
// Slice Shapes concept - retrying a level often
/*
 A level from the Slice Shapes concept was completed or abandoned with more tries than
 95% of all players, as determined by our previous analytics. Each level has a different
 threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"EqualShares1\" AND CAST(retry as integer)>=1) OR \
                (level=\"EqualShares2\" AND CAST(retry as integer)>=2) OR \
                (level=\"EqualShares3\" AND CAST(retry as integer)>=7) OR \
                (level=\"EqualShares4\" AND CAST(retry as integer)>=7) OR \
                (level=\"EqualShares7\" AND CAST(retry as integer)>=6) OR \
                (level=\"FunChainReaction\" AND CAST(retry as integer)>=1) OR \
                (level=\"EqualShares5\" AND CAST(retry as integer)>=6) OR \
                (level=\"EqualShares6\" AND CAST(retry as integer)>=7) OR \
                (level=\"EqualShares8\" AND CAST(retry as integer)>=8) OR \
                (level=\"RewardEqualShares\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunChainedLavaBlocks\" AND CAST(retry as integer)>=4)";

        //console.log("wo3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo3 DB Error:", err);
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
// Shape Comparison concept - retrying a level often
/*
 A level from the Shape Comparison concept was completed or abandoned with more
 tries than 95% of all players, as determined by our previous analytics. Each level
 has a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo4 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"OutlinesIntro1\" AND CAST(retry as integer)>=5) OR \
                (level=\"OutlinesIntro2\" AND CAST(retry as integer)>=7) OR \
                (level=\"SymbolicNot1\" AND CAST(retry as integer)>=5) OR \
                (level=\"SymbolicNot2\" AND CAST(retry as integer)>=6) OR \
                (level=\"RewardSymbRepA\" AND CAST(retry as integer)>=1)";

        //console.log("wo4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo4 DB Error:", err);
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
// Symbolic Numerator concept - retrying a level often
/*
 A level from the Symbolic Numerator concept was completed or abandoned with more
 tries than 95% of all players, as determined by our previous analytics. Each level
 has a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo5 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"SymbolicNot3\" AND CAST(retry as integer)>=6) OR \
                (level=\"SymbolicNot6\" AND CAST(retry as integer)>=5) OR \
                (level=\"FunMammothLaunch\" AND CAST(retry as integer)>=2) OR \
                (level=\"SymbolicNot4\" AND CAST(retry as integer)>=7) OR \
                (level=\"SymbolicNot5\" AND CAST(retry as integer)>=5) OR \
                (level=\"RewardSymbRepB\" AND CAST(retry as integer)>=1)";

        //console.log("wo5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo5 DB Error:", err);
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
// Fractions Reading concept - retrying a level often
/*
 A level from the Fractions Reading concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo6 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"SymbToNumNot1\" AND CAST(retry as integer)>=1) OR \
                (level=\"SymbToNumNot2\" AND CAST(retry as integer)>=8) OR \
                (level=\"SymbToNumNot4\" AND CAST(retry as integer)>=7) OR \
                (level=\"SymbToNumNot3\" AND CAST(retry as integer)>=8) OR \
                (level=\"RewardNumRepA\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunFall\" AND CAST(retry as integer)>=4)";

        //console.log("wo6 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo6 DB Error:", err);
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
// Denominator concept - retrying a level often
/*
 A level from the Denominator concept was completed or abandoned with more tries than
 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo7 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"DenominatorRole1\" AND CAST(retry as integer)>=4) OR \
                (level=\"DenominatorRole2\" AND CAST(retry as integer)>=6) OR \
                (level=\"DenominatorRole4\" AND CAST(retry as integer)>=7) OR \
                (level=\"DenominatorRole3\" AND CAST(retry as integer)>=8) OR \
                (level=\"RewardNumRepB\" AND CAST(retry as integer)>=1)";

        //console.log("wo7 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo6 DB Error:", err);
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
                        id:   "wo7",
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
// Numerator concept - retrying a level often
/*
 A level from the Numerator concept was completed or abandoned with more tries than
 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo8 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FunWorld2Intro\" AND CAST(retry as integer)>=1) OR \
                (level=\"NumeratorRole1\" AND CAST(retry as integer)>=7) OR \
                (level=\"NumeratorRole2\" AND CAST(retry as integer)>=12) OR \
                (level=\"NumeratorRole3\" AND CAST(retry as integer)>=5) OR \
                (level=\"NumeratorRole4\" AND CAST(retry as integer)>=5) OR \
                (level=\"NumeratorRole5\" AND CAST(retry as integer)>=8) OR \
                (level=\"FunWhaleReveal\" AND CAST(retry as integer)>=1) OR \
                (level=\"NumeratorRole6\" AND CAST(retry as integer)>=7) OR \
                (level=\"NumeratorRole7\" AND CAST(retry as integer)>=6) OR \
                (level=\"NumeratorRole8\" AND CAST(retry as integer)>=6) OR \
                (level=\"RewardNumRepC\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunWhaleDivesUnderwater\" AND CAST(retry as integer)>=1)";

        //console.log("wo8 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo8 DB Error:", err);
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
                        id:   "wo8",
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
// Pie Charts concept - retrying a level often
/*
 A level from the Pie Charts concept was completed or abandoned with more tries than
 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo9 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FunRockRamp\" AND CAST(retry as integer)>=6) OR \
                (level=\"Circle1\" AND CAST(retry as integer)>=8) OR \
                (level=\"Circle2\" AND CAST(retry as integer)>=13) OR \
                (level=\"Circle3\" AND CAST(retry as integer)>=12) OR \
                (level=\"Circle4\" AND CAST(retry as integer)>=5) OR \
                (level=\"Circle5\" AND CAST(retry as integer)>=6) OR \
                (level=\"RewardCircle\" AND CAST(retry as integer)>=1) OR \
                (level=\"World02FunEnd\" AND CAST(retry as integer)>=3)";

        //console.log("wo9 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo9 DB Error:", err);
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
                        id:   "wo9",
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
// Size Comparison concept - retrying a level often
/*
 A level from the Size Comparison concept was completed or abandoned with more tries than
 95% of all players, as determined by our previous analytics. Each level has a different
 threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo10 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"EquivalentFract1\" AND CAST(retry as integer)>=12) OR \
                (level=\"FractionSize1\" AND CAST(retry as integer)>=3) OR \
                (level=\"FractionSize2\" AND CAST(retry as integer)>=4) OR \
                (level=\"FractionSize3\" AND CAST(retry as integer)>=4) OR \
                (level=\"FractionSize4\" AND CAST(retry as integer)>=15) OR \
                (level=\"FractionSize5\" AND CAST(retry as integer)>=8) OR \
                (level=\"SFFSRewardFractionSize\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunLinkedShapes\" AND CAST(retry as integer)>=6)";

        //console.log("wo10 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo10 DB Error:", err);
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
                        id:   "wo10",
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
// Equivalent Fractions (A) concept - retrying a level often
/*
 A level from the Equivalent Fractions (A) concept was completed or abandoned with more
 tries than 95% of all players, as determined by our previous analytics. Each level has
 a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo11 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FractionSize6\" AND CAST(retry as integer)>=5) OR \
                (level=\"FractionSize7\" AND CAST(retry as integer)>=10) OR \
                (level=\"EquivalentFract8\" AND CAST(retry as integer)>=4) OR \
                (level=\"EquivalentFract9\" AND CAST(retry as integer)>=3) OR \
                (level=\"EquivalentFract10\" AND CAST(retry as integer)>=6) OR \
                (level=\"EquivalentFract11\" AND CAST(retry as integer)>=9) OR \
                (level=\"EquivalentFract12\" AND CAST(retry as integer)>=8) OR \
                (level=\"EquivalentFract13\" AND CAST(retry as integer)>=5) OR \
                (level=\"RewardEquivFractA\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunWorld3Outro\" AND CAST(retry as integer)>=1)";

        //console.log("wo11 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo11 DB Error:", err);
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
                        id:   "wo11",
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
// Equivalent Fractions (B) concept - retrying a level often
/*
 A level from the Equivalent Fractions (B) concept was completed or abandoned with more
 tries than 95% of all players, as determined by our previous analytics. Each level has
 a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo12 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FunMysteriousEyes\" AND CAST(retry as integer)>=1) OR \
                (level=\"EquivalentFract2\" AND CAST(retry as integer)>=6) OR \
                (level=\"EquivalentFract3\" AND CAST(retry as integer)>=4) OR \
                (level=\"EquivalentFract4\" AND CAST(retry as integer)>=8) OR \
                (level=\"FunDiagonalSlice\" AND CAST(retry as integer)>=3) OR \
                (level=\"EquivalentFract5\" AND CAST(retry as integer)>=11) OR \
                (level=\"SFFSRewardEquivalentFractC\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunJenga\" AND CAST(retry as integer)>=2)";

        //console.log("wo12 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo12 DB Error:", err);
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
                        id:   "wo12",
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
// Fractions Ordering concept - retrying a level often
/*
 A level from the Fractions Ordering concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo13 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"Ordering1\" AND CAST(retry as integer)>=3) OR \
                (level=\"Ordering2\" AND CAST(retry as integer)>=4) OR \
                (level=\"Ordering3\" AND CAST(retry as integer)>=5) OR \
                (level=\"RewardCmpFract\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunMushroomJingleIntro\" AND CAST(retry as integer)>=1)";

        //console.log("wo13 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo13 DB Error:", err);
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
                        id:   "wo13",
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
// Question Marks concept - retrying a level often
/*
 A level from the Question Marks concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has a
 different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo14 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FractionsOnUA1\" AND CAST(retry as integer)>=10) OR \
                (level=\"FractionsOnUA2\" AND CAST(retry as integer)>=5) OR \
                (level=\"FractionsOnUA3\" AND CAST(retry as integer)>=5) OR \
                (level=\"FractionsOnUA4\" AND CAST(retry as integer)>=5) OR \
                (level=\"RewardFractionsOnUA\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunRockstarMushroom\" AND CAST(retry as integer)>=1) OR \
                (level=\"FunFreeSliceColumn\" AND CAST(retry as integer)>=6)";

        //console.log("wo14 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo14 DB Error:", err);
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
                        id:   "wo14",
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
// Subtraction concept - retrying a level often
/*
 A level from the Subtraction concept was completed or abandoned with more tries
 than 95% of all players, as determined by our previous analytics. Each level has
 a different threshold retry count, which is provided in the Level List tab.
 */
SLFR_SoWo.prototype.wo15 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT part1.eventData_Value as retry, part2.eventData_Value as level FROM \
                (SELECT * FROM events \
                WHERE eventData_Key=\"retryCount\") as part1 \
                JOIN \
                (SELECT * FROM events \
                WHERE eventData_Key=\"levelID\") as part2 \
                ON part1.eventId = part2.eventId \
                WHERE \
                (level=\"FractionSub1\" AND CAST(retry as integer)>=10) OR \
                (level=\"FractionSub2\" AND CAST(retry as integer)>=6) OR \
                (level=\"FractionSub3\" AND CAST(retry as integer)>=7) OR \
                (level=\"FractionSub4\" AND CAST(retry as integer)>=7) OR \
                (level=\"FractionSub5\" AND CAST(retry as integer)>=11) OR \
                (level=\"RewardFractSub\" AND CAST(retry as integer)>=1)";

        //console.log("wo15 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo wo15 DB Error:", err);
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
                        id:   "wo15",
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
// Covers all 15 shout outs.
/*
 Completed all levels the concept (see Name/ID field) with a retryCount=0. Levels
 per concepts are provided in the Level List tab.
 */
SLFR_SoWo.prototype.so1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var conceptMapping = {
            "gameplay": "so1",
            "split_groups": "so2",
            "equal_shares": "so3",
            "symbolic_representation_a": "so4",
            "symbolic_representation_b": "so5",
            "numerical_representation_a": "so6",
            "numerical_representation_b": "so7",
            "numerical_representation_c": "so8",
            "circles": "so9",
            "size_comp": "so10",
            "equivalent_fractions_a": "so11",
            "equivalent_fractions_b": "so12",
            "compare_fractions_a": "so13",
            "question_mark": "so14",
            "fraction_subtraction_a": "so15"
        };

        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT DISTINCT gameLevel FROM \
                (SELECT gameSessionId, gameLevel, SUM(CASE \
                WHEN eventData_Key=\"retryCount\" AND CAST(eventData_Value as integer)=0 \
                THEN 1 ELSE 0 END) AS rc \
                FROM events GROUP BY gameSessionId,gameLevel ORDER BY gameLevel ASC) AS inner \
                WHERE \
                (inner.gameLevel=\"gameplay\" AND rc>=5) OR \
                (inner.gameLevel=\"split_groups\" AND rc>=5) OR \
                (inner.gameLevel=\"equal_shares\" AND rc>=10) OR \
                (inner.gameLevel=\"symbolic_representation_a\" AND rc>=5) OR \
                (inner.gameLevel=\"symbolic_representation_b\" AND rc>=6) OR \
                (inner.gameLevel=\"numerical_representation_a\" AND rc>=6) OR \
                (inner.gameLevel=\"numerical_representation_b\" AND rc>=5) OR \
                (inner.gameLevel=\"numerical_representation_c\" AND rc>=12) OR \
                (inner.gameLevel=\"circles\" AND rc>=8) OR \
                (inner.gameLevel=\"size_comp\" AND rc>=8) OR \
                (inner.gameLevel=\"equivalent_fractions_a\" AND rc>=10) OR \
                (inner.gameLevel=\"equivalent_fractions_b\" AND rc>=8) OR \
                (inner.gameLevel=\"compare_fractions_a\" AND rc>=5) OR \
                (inner.gameLevel=\"question_mark\" AND rc>=7) OR \
                (inner.gameLevel=\"fraction_subtraction_a\" AND rc>=6)";

        //console.log("so1 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - SLFR_SoWo so1 DB Error:", err);
                reject(err);
                return;
            }

            // no results
            if(!results.length) {
                // do nothing
                resolve();
                return;
            }

            // Iterate through the results to get all triggered shout outs
            var shoutOuts = [];
            for( var i = 0; i < results.length; i++ ) {
                var concept = conceptMapping[ results[i].gameLevel ];
                if( concept !== undefined ) {
                    shoutOuts.push(
                        {
                            id:   concept,
                            type: "shoutout",
                            total: total,
                            overPercent: (total - threshold + 1)/(max - threshold + 1)
                        }
                    );
                }
            }

            total = shoutOuts.length;
            if(total >= threshold) {
                // over is 0 - 1 float percent of the amount past threshold over max
                resolve( shoutOuts );
            } else {
                // do nothing
                resolve();
            }
        });
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};