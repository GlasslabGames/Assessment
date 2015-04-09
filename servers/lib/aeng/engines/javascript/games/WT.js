/**
 * Wuzzit Trouble ShoutOut and WatchOut Module
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

module.exports = WT_SoWo;

/*
 ** Source Document **
 WT Shout Out, Watch Out - [link here]
*/

function WT_SoWo(engine, aeService, options){
    this.version = 0.01;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );

    this.engine = engine;
}


WT_SoWo.prototype.process = function(userId, gameId, gameSessionId, eventsData) {

    var filterEventTypes = [ "so1", "so2", "so3", "so4", "so5", "so6", "so7", "wo1", "wo2", "wo3", "wo4" ];
    var filterEventKeys = [ "shout_out", "watch_out" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.wo1.bind(this),
        this.wo2.bind(this),
        this.wo3.bind(this),
        this.wo4.bind(this),
        this.so1.bind(this),
        this.so2.bind(this),
        this.so3.bind(this),
        this.so4.bind(this),
        this.so5.bind(this),
        this.so6.bind(this),
        this.so7.bind(this)
    ]);
};

// ===============================================
// No negative rotate
/*
 Puzzle 1-9 completed but player has not used a negative-rotate.

 wo1
 */
WT_SoWo.prototype.wo1 = function(db) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var sql;
    var total = 0;
    var threshold = 1;
    var max = 1;
    sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"wo1\" \
            LIMIT 1";

    //console.log("wo1 sql:", sql);
    db.all(sql, function(err, results) {
        if(err) {
            console.error("AssessmentEngine: Javascript_Engine - WT_SoWo wo1 DB Error:", err);
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
// No multi-rotate
/*
 Puzzle 1-11 completed but player has not used multi-rotate.

 wo2
 */
WT_SoWo.prototype.wo2 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"wo2\" \
            LIMIT 1";

        //console.log("wo2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo wo2 DB Error:", err);
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
// No strategy
/*
 Puzzle 1-25 completed but player has not earned three stars on 5 or more of the puzzles from 1-15 onward.

 wo3
 */
WT_SoWo.prototype.wo3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"wo3\" \
            LIMIT 1";

        //console.log("wo3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo wo3 DB Error:", err);
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
// No combinations
/*
 Player unable to solve puzzle 2-2,2-6,2-9.

 wo4
 */
WT_SoWo.prototype.wo4 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
            WHERE \
            eventName=\"wo4\" \
            LIMIT 1";

        //console.log("wo4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo wo4 DB Error:", err);
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
// Multi-rotate
/*
 Player scores three stars on puzzle 1-3

 so1
 */
WT_SoWo.prototype.so1 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so1\" \
                LIMIT 1";

        //console.log("so1 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so1 DB Error:", err);
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
// Negative rotate
/*
 Player scores three stars on puzzle 1-4

 so2
 */
WT_SoWo.prototype.so2 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so2\" \
                LIMIT 1";

        //console.log("so2 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so2 DB Error:", err);
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
// Multi-negative
/*
 Player scores three stars on puzzle 1-5

 so3
 */
WT_SoWo.prototype.so3 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so3\" \
                LIMIT 1";

        //console.log("so3 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so3 DB Error:", err);
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
// Positive and negative
/*
 Player scores three stars on puzzle 1-6

 so4
 */
WT_SoWo.prototype.so4 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so4\" \
                LIMIT 1";

        //console.log("so4 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so4 DB Error:", err);
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


// ===============================================
// Strategy
/*
 Player scores three stars on puzzle 1-15

 so5
 */
WT_SoWo.prototype.so5 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so5\" \
                LIMIT 1";

        //console.log("so5 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so5 DB Error:", err);
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
                        id:   "so5",
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
// Two cogs
/*
 Player scores three stars on puzzle 2-2

 so6
 */
WT_SoWo.prototype.so6 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so6\" \
                LIMIT 1";

        //console.log("so6 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so6 DB Error:", err);
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
                        id:   "so6",
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
// Better solution
/*
 Player scores three stars in fewer than the stated threshold. (Any puzzle.)

 so7
 */
WT_SoWo.prototype.so7 = function(db) {
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        var sql;
        var total = 0;
        var threshold = 1;
        var max = 1;
        sql = "SELECT COUNT(*) as total FROM events \
                WHERE \
                eventName=\"so7\" \
                LIMIT 1";

        //console.log("so7 sql:", sql);
        db.all(sql, function(err, results) {
            if(err) {
                console.error("AssessmentEngine: Javascript_Engine - WT_SoWo so7 DB Error:", err);
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
                        id:   "so7",
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