/**
 * Assessment SimCity Distiller Module
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

module.exports = AA_SoWo;

function AA_SoWo(){
    this.version = 0.01;

    // this is a list of function names that will be ran every time process is called
    this.rules = [
        'wo_rule1',
        'wo_rule3'
    ];
}

/*
    Dump all the relivent events into an in memory SQLite DB
    Run some Q's and return results
 */
AA_SoWo.prototype.process = function(eventsList) {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    var db = new sqlite3.Database(':memory:');
    db.serialize(function() {
        var sql;

        sql = "CREATE TABLE events (\
                userId INT, \
                clientTimeStamp DATETIME, \
                serverTimeStamp DATETIME, \
                eventName TEXT, \
                gameSessionEventOrder INT, \
                eventData_Key TEXT, \
                eventData_Value TEXT,\
                target TEXT)";
        db.run(sql);

        // insert
        sql = "INSERT INTO events ( \
                userId, \
                clientTimeStamp, \
                serverTimeStamp, \
                eventName, \
                gameSessionEventOrder, \
                eventData_Key, \
                eventData_Value, \
                target \
            ) VALUES (?,?,?,?,?,?,?,?)";

        var filterEventTypes = ["Fuse_core", "Launch_attack"];
        var filterEventKeys = ["weakness", "success"];

        var totalNumEvents = 0;
        for (var i = 0; i < eventsList.length; i++) {
            // skip if not events
            if(!eventsList[i].events) continue;

            totalNumEvents += eventsList[i].events.length;
            for (var j = 0; j < eventsList[i].events.length; j++) {

                // only add events if in filter list
                if( !_.contains(filterEventTypes, eventsList[i].events[j].eventName) ) continue;

                for( var key in eventsList[i].events[j].eventData) {

                    // only add event data if in filter list
                    if( !_.contains(filterEventKeys, key) ) continue;

                    var value = eventsList[i].events[j].eventData[key];
                    var row = [
                        eventsList[i].userId,
                        eventsList[i].events[j].clientTimeStamp,
                        eventsList[i].events[j].serverTimeStamp,
                        eventsList[i].events[j].eventName,
                        eventsList[i].events[j].gameSessionEventOrder || i,
                        key,
                        value,
                        eventsList[i].events[j].eventData['target'] || ""
                    ];
                    db.run(sql, row);
                }
            }
        }
        console.log("AA_SoWo: process - # of events:", totalNumEvents);

        var promiseList = [];
        for (var i = 0; i < this.rules.length; i++) {
            // calling the function
            if( this[ this.rules[i] ] ) {
                promiseList.push( this[ this.rules[i] ](db) );
            }
        }

        var results = {
            watchout:[],
            shoutout:[],
            version: this.version
        };

        var rulesPromise = when.reduce(promiseList,
            function (sum, value) {

                if(_.isObject(value)) {
                    if(value.watchout) {
                        sum.watchout.push(value.watchout);
                    }
                    else if(value.shoutout) {
                        sum.shoutout.push(value.shoutout);
                    }
                }

                //console.log("rule - sum:", sum, ", value:", value);
                return sum;
            }, results);

        rulesPromise
            .then(function(sum){
                //console.log("rulesPromise sum:", sum);
                resolve(sum);
            }.bind(this))

        // catch all errors
        .then(null, function(err){
            reject(err);
        }.bind(this));

    }.bind(this));
    db.close();
// ------------------------------------------------
}.bind(this));
// end promise wrapper
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
            console.error("wo_rule1 DB Error:", err);
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
                    watchout: {
                        id: "wo1",
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
            console.error("wo_rule3 DB Error:", err);
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
                    watchout: {
                        id: "wo3",
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

