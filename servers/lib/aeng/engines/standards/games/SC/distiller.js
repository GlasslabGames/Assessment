var _       = require('lodash');
var when    = require('when');
var redis   = require('redis');
// Glasslab libs

var batchId = 0;

module.exports = SC_Distiller;

function SC_Distiller()
{
    // Glasslab libs
}

SC_Distiller.prototype.preProcess = function(sessionsEvents)
{
    var events = sessionsEvents[0];
    console.log("Starting preProcess");
    batchId++;
    var distilledData = {};

    // Process data through distiller function
    var eventsList = events.events;
    for( var i = 0; i < eventsList.length; i++ ) {
        // Get the event name
        var eventName = eventsList[i].name;
        var eventData = eventsList[i].eventData;
        distilledData[batchId + "_" + eventName] = eventData;
    }

    // return distilled data
    return distilledData;
};

SC_Distiller.prototype.postProcess = function(distilled) {
    var standardsData = {data: distilled};
    return standardsData;
};
