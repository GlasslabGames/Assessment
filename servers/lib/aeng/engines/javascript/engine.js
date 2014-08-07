/**
 * Assessment SimCity Distiller Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *
 */
var path    = require('path');
// Third-party libs
var _       = require('lodash');
var when    = require('when');
var sqlite3 = require('sqlite3').verbose();
// Glasslab libs

module.exports = JavascriptEngine;

function JavascriptEngine(engineDir, options){
    this.engineDir = engineDir;

    this.options = _.merge(
        { },
        options
    );
}


JavascriptEngine.prototype.run = function(gameSessionId, gameId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // load file and run
    try {
        //console.log("AssessmentEngine: Javascript_Engine - getDistillerFunction cwd:", process.cwd());
        var file = this.engineDir + "games"+path.sep + gameId+".js";
        var game = require(file);

        var g = new game(this.options, this);
        g.process(eventsData).then(resolve, reject);

    } catch(err) {
        console.error("AssessmentEngine: Javascript_Engine - Get Distiller Function Error -", err);
        reject(err);
    }

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

/*
 Dump all the relivent events into an in memory SQLite DB
 Run some Q's and return results
 */
JavascriptEngine.prototype.processEventRules = function(filterEventTypes, filterEventKeys, ruleFuncs) {
// add promise wrapper
return when.promise(function (resolve, reject) {
// ------------------------------------------------

    var db = new sqlite3.Database(':memory:');
    db.serialize(function () {
        var sql;

        sql = "CREATE TABLE events (\
            userId INT, \
            clientTimeStamp DATETIME, \
            serverTimeStamp DATETIME, \
            eventName TEXT, \
            gameLevel TEXT, \
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
            gameLevel, \
            gameSessionEventOrder, \
            eventData_Key, \
            eventData_Value, \
            target \
        ) VALUES (?,?,?,?,?,?,?,?)";

        var totalNumEvents = 0;
        for (var i = 0; i < eventsList.length; i++) {
            // skip if not events
            if (!eventsList[i].events) continue;

            totalNumEvents += eventsList[i].events.length;
            for (var j = 0; j < eventsList[i].events.length; j++) {

                // only add events if in filter list
                if (!_.contains(filterEventTypes, eventsList[i].events[j].eventName)) continue;

                for (var key in eventsList[i].events[j].eventData) {

                    // only add event data if in filter list
                    if (!_.contains(filterEventKeys, key)) continue;

                    var value = eventsList[i].events[j].eventData[key];
                    var row = [
                        eventsList[i].userId,
                        eventsList[i].events[j].clientTimeStamp,
                        eventsList[i].events[j].serverTimeStamp,
                        eventsList[i].events[j].eventName,
                        eventsList[i].events[j].gameLevel || "",
                        eventsList[i].events[j].gameSessionEventOrder || i,
                        key,
                        value,
                        eventsList[i].events[j].eventData['target'] || ""
                    ];
                    db.run(sql, row);
                }
            }
        }
        if (this.options.env == "dev") {
            console.log("AssessmentEngine: Javascript_Engine - SC_SoWo: process - # of events:", totalNumEvents);
        }

        var promiseList = [];
        for (var i = 0; i < ruleFuncs.length; i++) {
            // calling the function
            if (_.isFunction(ruleFuncs[i])) {
                promiseList.push(ruleFuncs[i](db));
            }
        }

        var results = {
            watchout: [],
            shoutout: [],
            version: this.version
        };

        var rulesPromise = when.reduce(promiseList,
            function (sum, value) {

                if (_.isObject(value)) {
                    if (value.watchout) {
                        sum.watchout.push(value.watchout);
                    }
                    else if (value.shoutout) {
                        sum.shoutout.push(value.shoutout);
                    }
                }

                //console.log("rule - sum:", sum, ", value:", value);
                return sum;
            }, results);

        rulesPromise
            .then(function (sum) {
                //console.log("rulesPromise sum:", sum);
                resolve(sum);
            }.bind(this))

            // catch all errors
            .then(null, function (err) {
                reject(err);
            }.bind(this));

    }.bind(this));
    db.close();

// ------------------------------------------------
}.bind(this));
// end promise wrapper
}