/**
 * Teachable Agents Stanford Report Module
 *
 */

var _       = require('lodash');
var when    = require('when');
var sqlite3 = require('sqlite3').verbose();

module.exports = TA_Stanford;

function TA_Stanford(engine, aeService, options, aInfo) {
    this.version = 0.1;
    this.aeService = aeService;
    this.options = _.merge({

    }, options);

    this.engine = engine;
    this.aInfo = aInfo;
}


TA_Stanford.prototype.process = function(userId, gameId, gameSessionId, eventsData) {
    var filterEventTypes = [
        "currentMap"
    ];
    // always include one or more keys for a give type above
    var filterEventKeys = [
        "all"
        // "mapQuality",   // currentMap
        // "levelID",      // currentMap
        // "classCode",    // currentMap
        // "timeStamp",    // currentMap
        // "currentTopic", // currentMap
        // "galaxy",       // currentMap
        // "map"           // currentMap
    ];

    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
	    this.collect_map_data.bind(this)
    ])
};

TA_Stanford.prototype.collect_map_data = function(engine, db) {
return when.promise(function(resolve, reject) {

    var sql = 'SELECT * FROM events \
        WHERE \
            eventName="currentMap" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC, eventData_Key ASC';

    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: Stanford_Engine - TA_Stanford.collect_map_data DB Error:", err);
            reject(err);
            return;
        }

        var mapData = {};

        for (var i=0; i < results.length; i++) {
            var e = results[i];
            
            if (e.eventName == "currentMap") {
                if (!mapData[e.eventId]) {
                    mapData[e.eventId] = {};
                }
                mapData[e.eventId][e.eventData_Key] = e.eventData_Value;
            }
        }

        resolve(mapData)
    }.bind(this))

}.bind(this));
};
