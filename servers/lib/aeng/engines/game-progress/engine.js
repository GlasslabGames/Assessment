/**
 * Assessment Engine Module for Standards
 *
 */
var fs            = require('fs');
var path          = require('path');
// Third-party libs
var _       = require('lodash');
var when    = require('when');
// Glasslab libs
var Util;

function GameProgressEngine(aeService, engineDir, options) {
    this.version = 0.01;

    this.engineDir = engineDir;
    this.aeService = aeService;

    Util = require( path.resolve(engineDir, '../../../core/util.js') );

    this.options = _.merge(
        { },
        options
    );
}

GameProgressEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData, aInfo){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        var trackedEvents = [];

        for (var i = 0; i < eventsData.length; i++) {
            // skip if not events
            if (!eventsData[i].events) continue;


            for (var j = 0; j < eventsData[i].events.length; j++) {
                //console.log(eventsData[i].events[j]);

                if (eventsData[i].events[j].eventData["Basetype"] === "Unit_Start") {
                    trackedEvents.push(eventsData[i].events[j]);
                } else if (eventsData[i].events[j].eventData["Basetype"] === "Unit_End") {
                    trackedEvents.push(eventsData[i].events[j]);
                }
            }
        }
        trackedEvents = _.sortBy(trackedEvents, 'timestamp');
        console.log(JSON.stringify(trackedEvents, null, 2));

        var progressData = {
            totalTime: 0,
            events: []
        };

        var trackedEventType;
        var trackedEventId;
        var trackedEventStartTime;
        var trackedEventDuration;

        for (i = 0; i < trackedEvents.length; i++) {


            if (trackedEvents[i].eventData["Basetype"] === "Unit_Start") {

                trackedEventType = trackedEvents[i].eventData["Subcategory"];
                trackedEventId = trackedEvents[i].eventData["Current_unitID_main"];
                trackedEventStartTime = trackedEvents[i].timestamp;

                //console.log(new Date(trackedEventStartTime).toISOString().substr(0,19), trackedEventType, "start", trackedEventId);

                //console.log(eventsData[i].events[j].eventData["Subcategory"], "start");
            } else if (trackedEvents[i].eventData["Basetype"] === "Unit_End") {

                if (trackedEventType === trackedEvents[i].eventData["Subcategory"]
                    && trackedEventId === trackedEvents[i].eventData["Current_unitID_main"]) {

                    trackedEventDuration = trackedEvents[i].timestamp - trackedEventStartTime;
                    //console.log(new Date(trackedEvents[i].timestamp).toISOString().substr(0,19), trackedEventType, "end  ",
                    //    trackedEventId,
                    //    trackedEventDuration);

                    progressData.events.push({type: trackedEventType, id: trackedEventId, duration: trackedEventDuration})
                    progressData.totalTime += trackedEventDuration;

                }
                //console.log(eventsData[i].events[j].eventData["Subcategory"], "end");
            }
        }

        resolve(progressData);

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

module.exports = GameProgressEngine;
