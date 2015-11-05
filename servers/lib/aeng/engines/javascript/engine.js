/**
 * Assessment Engine Module for Javascript
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

    Util = require( path.resolve(engineDir, '../../../core/util.js') );

    this.options = _.merge(
        { },
        options
    );

    this.requestUtil   = new Util.Request(this.options);
}

JavascriptEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

/*
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
*/

    var g;
    var file;
    var game;
    var got_game;

    try {
        file = this.engineDir + "games"+path.sep + gameId+".js";
        game = require(file);
        got_game = true;
    } catch(err) {
        got_game = false;
    }


got_game = false;


// XXXXXXXX        XXXXXXXX
//   XXXXXXXX    XXXXXXXX
//     XXXXXXXXXXXXXXXX
//       XXXXXXXXXXXX
//         XXXXXXXX
//       XXXXXXXXXXXX
//     XXXXXXXXXXXXXXXX
//   XXXXXXXX    XXXXXXXX
// XXXXXXXX        XXXXXXXX


    if(got_game) {

        // load file and run
        try {

            file = this.engineDir + "games"+path.sep + gameId+".js";
            game = require(file);

            g = new game(this, this.aeService, this.options);
            g.process(userId, gameId, gameSessionId, eventsData).then(resolve, reject);

        } catch(err) {
            console.error("AssessmentEngine: Javascript_Engine - Get Distiller Function Error -", err);
            reject(err);
        }
    } else {

        // auto process SOWO events
        this._processAutoSOWOs(this, userId, gameId, gameSessionId, eventsData)
        .then(resolve, reject);

    }

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

JavascriptEngine.prototype.awardBadge = function(userId, badgeId) {
    var addr = this.options.sdk.connect;
    if ( ! addr ) {
        addr = "localhost";
    }
    var url = "http://" + this.options.sdk.connect + ":" + this.options.services.appExternalPort + "/api/v2/dash/badge/" + badgeId + "/generateCode/" + userId;

    console.log("awardBadge ", url);

    this.requestUtil.postRequest( url, null, null,
        function( err, result, data ) {
            if ( data ) {
                console.log("Awarded");
            } else if ( err ) {
                console.log("Failed to award ", err);
            }
        }.bind(this) );
}

//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//                     XXXXXXXX                            XXXXXXXX
//                       XXXXXXXX                        XXXXXXXX
//                         XXXXXXXX                    XXXXXXXX
//                           XXXXXXXX                XXXXXXXX
//                             XXXXXXXX            XXXXXXXX
//                               XXXXXXXX        XXXXXXXX
//                                 XXXXXXXX    XXXXXXXX
//                                   XXXXXXXXXXXXXXXX
//                                     XXXXXXXXXXXX
//                                       XXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/*
 Telemetry can directly trigger Shout Outs and Watch Outs.
*/
JavascriptEngine.prototype._processAutoSOWOs = function(that, userId, gameId, gameSessionId, eventsData) {
return when.promise(function (resolve, reject) {

    // // testing
    // if (eventsData[0].events) {
    //     // var len = eventsData[0].events.length;
    //     eventsData[0].events.push( { id: 'so5', type: 'trigger_shout_out'} );
    // }

    var xtest = {};     // { id: 'soNN', type: "shoutout", total: 0 };

    console.log('    ----    JavascriptEngine.prototype._processAutoSOWOs() ...');
    console.log('    ----        * eventsData[] length =', eventsData.length);

    for (var i = 0; i < eventsData.length; ++i) {

        if (!eventsData[i].events) continue;    // skip if not events

        console.log('    ----        * eventsData[', i, '] :');
        console.log('    ----            * userId =', eventsData[i].userId);
        console.log('    ----            * gameSessionId =', eventsData[i].gameSessionId);
        console.log('    ----            * events[] length =', eventsData[i].events.length);

        for (var j = 0; j < eventsData[i].events.length; j++) {

            if (!eventsData[i].events[j].eventName) continue;
            if (!eventsData[i].events[j].eventData) continue;

            var enm = eventsData[i].events[j].eventName || '';
            var ttp = eventsData[i].events[j].totalTimePlayed || 0;
            var gmlvl = eventsData[i].events[j].gameLevel || '';

            console.log('    ----            * events[', j, '] :');
            console.log('    ----                * eventName  =', enm);
            console.log('    ----                * totalTimePlayed  =', ttp);
            console.log('    ----                * gameLevel  =', gmlvl);
            console.log('    ----                * eventData :');

            console.log('    xxxx    DBG     This is where trigger_shout_out is checked ...');

//            if (!eventsData[i].events[j].eventData.keySOWO) continue;
//
//            var sowo_ID = eventsData[i].events[j].eventData.keySOWO;  // 'so15' or 'wo4'

            if ('trigger_shout_out' == eventsData[i].events[j].eventName) {
                xtest = { id: sowo_ID, type: 'shoutout', total: 0 };
            }

            if ('trigger_watch_out' == eventsData[i].events[j].eventName) {
                xtest = { id: sowo_ID, type: 'watchout', total: 0 };
            }

            // for (var key in eventsData[i].events[j].eventData) {    // for all eventData
            //     console.log('    ----                    * eventData {} key :', key);
            // }
        }
    }

    // resolve(sum);    // aggregate SOWO event tree

}.bind(this));
};

//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//                                       XXXXXXXX
//                                     XXXXXXXXXXXX
//                                   XXXXXXXXXXXXXXXX
//                                 XXXXXXXX    XXXXXXXX
//                               XXXXXXXX        XXXXXXXX
//                             XXXXXXXX            XXXXXXXX
//                           XXXXXXXX                XXXXXXXX
//                         XXXXXXXX                    XXXXXXXX
//                       XXXXXXXX                        XXXXXXXX
//                     XXXXXXXX                            XXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//             XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/*
 Dump all the relivent events into an in memory SQLite DB
 Run some Q's and return results
*/
JavascriptEngine.prototype.processEventRules = function(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, ruleFuncs) {
// add promise wrapper
return when.promise(function (resolve, reject) {
// ------------------------------------------------

    //var fs = require('fs');
    //var file = "./"+gameId+"-"+eventsData[0].events[0].gameLevel+"-"+gameSessionId.substring(0,4)+".json";
    //fs.writeFileSync(file, JSON.stringify(eventsData, null, 2));
    //console.log("eventsData:", );

    //var dbFile = '/Users/josephsutton/Documents/temp.db';
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




        if (0 < eventsData.length) {
            console.log('\nzzzzzzzzzzzzzzzz        zzzzzzzzzzzzzzzz        zzzzzzzzzzzzzzzz');
            console.log('eventsData[0].events[0].eventData =', eventsData[0].events[0].eventData);
            console.log('\nzzzzzzzzzzzzzzzz                                zzzzzzzzzzzzzzzz');
            // console.log('eventsData[0] =', eventsData[0]);
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
                        value = value.toString();
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
            console.log("AssessmentEngine: Javascript_Engine - processEventRules: process - # of events:", totalNumEvents);
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

                var values = [];

                if ( _.isObject(value) &&
                     value.type &&
                     value.id ) {
                    values.push( value );
                }
                else if( _.isArray(value) ) {
                    values = value;
                }

                for( var i = 0; i < values.length; i++ ) {
                    var nextValue = values[i];
                    if ( _.isObject(nextValue) &&
                        nextValue.type &&
                        nextValue.id ) {
                        // temp save type and id
                        var type = nextValue.type;
                        var id = nextValue.id;
                        // remove type and id, as they will be in the tree
                        delete nextValue.type;
                        delete nextValue.id;
                        // add time stamp and gameSessionId
                        nextValue.timestamp = Util.GetTimeStamp();
                        nextValue.gameSessionId = gameSessionId;

                        // if type not object make it one
                        if(!_.isObject(sum[type]) ) {
                            sum[type] = {};
                        }

                        sum[type][ id ] = nextValue;
                    }
                }

                console.log("rule - sum:", sum, ", value:", value);

                return sum;
            }, results);

        rulesPromise
            .then(function (sum) {
                console.log("rulesPromise sum:", sum);
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