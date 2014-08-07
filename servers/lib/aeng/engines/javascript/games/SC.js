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

function SC_SoWo(options, engine){
    this.version = 0.01;

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

SC_SoWo.prototype.process = function(eventsList) {

    var filterEventTypes = ["GL_Scenario_Summary", "GL_Zone", "GL_Unit_Bulldoze" ];
    var filterEventKeys = ["busStops", "type", "UGuid" ];

    // this is a list of function names that will be ran every time process is called
    return this.engine.processEventRules(filterEventTypes, filterEventKeys, [
        this.park_wo1.bind(this),
        this.park_so1.bind(this),

        this.alex_wo1.bind(this),
        this.alex_so1.bind(this),

        //this.sierra_wo1.bind(this),
        //this.sierra_so1.bind(this),

        this.jack_wo1.bind(this),
        //this.jack_so1.bind(this),
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
                    watchout: {
                        id: "park_wo1",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1)
                    }
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
                    shoutout: {
                        id: "park_so1",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1)
                    }
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
                    watchout: {
                        id: "alex_wo1",
                        total: total,
                        underPercent: 1/(max - total + 1)
                    }
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
                    shoutout: {
                        id: "alex_so1",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1),
                        data: results
                    }
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
                    watchout: {
                        id: "jack_wo1",
                        total: total,
                        overPercent: (total - threshold + 1)/(max - threshold + 1)
                    }
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