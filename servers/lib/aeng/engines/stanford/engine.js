/**
 * Engine Module for the Stanford Teachable Agents reports
 *
 * File created by kyle@concentricsky on Nov 28, 2017
 */

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var _ = require('lodash');
var when = require('when');
var Util;
var util = require('util');
var sqlite3 = require('sqlite3').verbose();
var JavascriptEngine = require('../javascript/engine');

//inherit from JavascriptEngine (which should probably be abstracted into a base and a 'sowo engine' added) -- Wiggins Oct2016

function StanfordEngine(aeService, engineDir, options) {
    // call super contructor
    JavascriptEngine.apply(this, arguments);
}
util.inherits(StanfordEngine, JavascriptEngine);

StanfordEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData, aInfo){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        var g;
        var file;
        var game;
        var got_game;
        var distiller = aInfo.engine;
        var distiller_path = this.engineDir + "distillers"+path.sep + distiller+".js";

        try {
            if (!distiller) {
                got_game = false;
            } else {
                game = require(distiller_path);
                got_game = true;
            }
        } catch(err) {
            got_game = false;
        }

        // got_game = false;   // wip testing

        if(got_game) {

            // load file and run
            try {
                game = require(distiller_path);

                g = new game(this, this.aeService, this.options, aInfo);
                g.process(userId, gameId, gameSessionId, eventsData).then(resolve, reject);

            } catch(err) {
                console.error("AssessmentEngine: Stanford_Engine - Get Distiller Function Error -", err);
                reject(err);
            }
        } else {

            // auto process SOWO events
            this._processAutoSOWOs(this, userId, gameId, gameSessionId, eventsData, aInfo)
                .then(resolve, reject);
        }

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

StanfordEngine.prototype.processEventRules = function(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, ruleFuncs) {
// add promise wrapper
    return when.promise(function (resolve, reject) {
// ------------------------------------------------
        var dbFile = ':memory:';
        var db = new sqlite3.Database(dbFile);
        db.serialize(function () {
            var sql;

            sql = "CREATE TABLE IF NOT EXISTS events (\
            eventId INT, \
            userId INT, \
            gameSessionId TEXT, \
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
            eventId, \
            userId, \
            gameSessionId, \
            clientTimeStamp, \
            serverTimeStamp, \
            eventName, \
            gameLevel, \
            gameSessionEventOrder, \
            eventData_Key, \
            eventData_Value, \
            target \
        ) VALUES (?, ?,?,?,?, ?,?,?, ?,?,?)";

            // check ahead if filterEventKeys contains "all"
            var gatherAllEvents = false;
            if( _.contains( filterEventKeys, "all" ) ) {
                gatherAllEvents = true;
            }

            var eventId = 0;
            var totalNumEvents = 0;
            for (var i = 0; i < eventsData.length; i++) {
                // skip if not events
                if (!eventsData[i].events) continue;

                totalNumEvents += eventsData[i].events.length;
                for (var j = 0; j < eventsData[i].events.length; j++) {

                    // only add events if in filter list
                    if (!_.contains(filterEventTypes, eventsData[i].events[j].eventName)) continue;

                    // for all eventData
                    for (var key in eventsData[i].events[j].eventData) {

                        // only add event data if in filter list
                        if (!_.contains(filterEventKeys, key) && !gatherAllEvents) continue;

                        var value = eventsData[i].events[j].eventData[key];
                        // convert to string
                        if(_.isObject(value)) {
                            value = JSON.stringify(value);
                        }
                        if(!_.isString(value)) {
                            try {
                                value = value.toString();
                            }
                            catch(e) {
                                value = "";
                            }
                        }

                        // Print the data for debugging
                        //console.log( eventId + " " + eventsData[i].gameSessionId + " " + eventsData[i].events[j].gameLevel + " " + eventsData[i].events[j].eventName + " " + key + " " + value );

                        var row = [
                            eventId,
                            eventsData[i].userId,
                            eventsData[i].gameSessionId,
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

                    // If the eventsData is empty and we're filtering for "all", add the event anyway
                    if( gatherAllEvents && _.isEmpty( eventsData[i].events[j].eventData ) ) {
                        var row = [
                            eventId,
                            eventsData[i].userId,
                            eventsData[i].gameSessionId,
                            eventsData[i].events[j].clientTimeStamp,
                            eventsData[i].events[j].serverTimeStamp,
                            eventsData[i].events[j].eventName,
                            eventsData[i].events[j].gameLevel || "",
                            eventsData[i].events[j].gameSessionEventOrder || i,
                            "",
                            "",
                            ""
                        ];
                        db.run(sql, row);
                    }

                    eventId++;
                }
            }

            if (this.options.env == "dev") {
                console.log("AssessmentEngine: Stanford_Engine - processEventRules: process - # of events:", totalNumEvents);
            }

            var promiseList = [];
            for (var i = 0; i < ruleFuncs.length; i++) {
                // calling the function
                if (_.isFunction(ruleFuncs[i])) {
                    promiseList.push(ruleFuncs[i](this,db, userId, gameId, gameSessionId, eventsData));
                }
            }

            when.all(promiseList)
                .then(function (list) {
                    resolve(list);
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

module.exports = StanfordEngine;
