var _       = require('lodash');
var when    = require('when');
var redis   = require('redis');
// Glasslab libs

module.exports = PRIMA_Distiller;

function PRIMA_Distiller()
{
    // Glasslab libs
}

PRIMA_Distiller.prototype.preProcess = function(sessionsEvents, currentResults)
{
    var events = sessionsEvents[0];
    console.log("Starting preProcess");
    var distilledData = {};

    // Process data through distiller function
    var eventsList = events.events;
    var name;
    var action;
    var data;
    var value;
    // these are AA-1 standards, I ported over the early, general work
    var standards = ["RI 6.8", "RI 7.8", "RI 8.8", "CCRA.R.1", "CCRA.R.8", "21st.RE", "21st.MJD"];
    var results = currentResults.results;

    if(_.isEmpty(results)) {
        standards.forEach(function (standard) {
            distilledData[standard] = {status: null};
        });
    } else {
        _.merge(distilledData, results);
    }

    _(eventsList).forEach(function(event){
        name = event.name;
        action = event.action;
        data = event.data;
        value = data.questId;
    });


    //for( var i = 0; i < eventsList.length; i++ ) {
    //    // Get the event name
    //    var eventName = eventsList[i].name;
    //    var eventData = eventsList[i].eventData;
    //    distilledData[batchId + "_" + eventName] = eventData;
    //}

    // return distilled data
    return distilledData;
};

PRIMA_Distiller.prototype.postProcess = function(distilled) {
    var standardsData = {data: distilled};
    return standardsData;
};
