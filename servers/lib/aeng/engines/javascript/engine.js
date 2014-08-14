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
var Util;

module.exports = JavascriptEngine;

function JavascriptEngine(aeService, engineDir, options){
    this.engineDir = engineDir;
    this.aeService = aeService;

    Util = require('../../../core/util.js');

    this.options = _.merge(
        { },
        options
    );
}

JavascriptEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // load file and run
    try {
        //console.log("AssessmentEngine: Javascript_Engine - getDistillerFunction cwd:", process.cwd());
        var file = this.engineDir + "games"+path.sep + gameId+".js";
        var game = require(file);

        var g = new game(this, this.aeService, this.options);
        g.process(userId, gameId, gameSessionId, eventsData).then(resolve, reject);

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
JavascriptEngine.prototype.processEventRules = function(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, ruleFuncs) {
// add promise wrapper
return when.promise(function (resolve, reject) {
// ------------------------------------------------

    // '/Users/josephsutton/Documents/temp.db'
    var db = new sqlite3.Database(':memory:');
    db.serialize(function () {
        var sql;

        sql = "CREATE TABLE IF NOT EXISTS events (\
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
        ) VALUES (?,?,?, ?,?,?, ?,?,?)";

        var totalNumEvents = 0;
        for (var i = 0; i < eventsData.length; i++) {
            // skip if not events
            if (!eventsData[i].events) continue;

            totalNumEvents += eventsData[i].events.length;
            for (var j = 0; j < eventsData[i].events.length; j++) {

                // only add events if in filter list
                if (!_.contains(filterEventTypes, eventsData[i].events[j].eventName)) continue;

                for (var key in eventsData[i].events[j].eventData) {

                    // only add event data if in filter list
                    if (!_.contains(filterEventKeys, key)) continue;

                    var value = eventsData[i].events[j].eventData[key];
                    var row = [
                        eventsData[i].userId,
                        eventsData[i].events[j].clientTimeStamp,
                        eventsData[i].events[j].serverTimeStamp,
                        eventsData[i].events[j].eventName,
                        eventsData[i].events[j].gameLevel || "",
                        eventsData[i].events[j].gameSessionEventOrder || i,
                        key,
                        value,
                        eventsData[i].events[j].eventData['target'] || ""
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
                promiseList.push(ruleFuncs[i](db, userId, gameId, gameSessionId, eventsData));
            }
        }

        var results = {};

        var rulesPromise = when.reduce(promiseList,
            function (sum, value) {

                if ( _.isObject(value) &&
                     value.type &&
                     value.id ) {
                    // temp save type and id
                    var type = value.type;
                    var id = value.id;
                    // remove type and id, as they will be in the tree
                    delete value.type;
                    delete value.id;
                    // add time stamp and gameSessionId
                    value.timestamp = Util.GetTimeStamp();
                    value.gameSessionId = gameSessionId;

                    // if type not object make it one
                    if(!_.isObject(sum[type]) ) {
                        sum[type] = {};
                    }

                    sum[type][ id ] = value;
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
};