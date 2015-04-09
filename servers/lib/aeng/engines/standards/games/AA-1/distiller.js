var _       = require('lodash');
var when    = require('when');
var redis   = require('redis');
// Glasslab libs

module.exports = AA_Distiller;

function AA_Distiller()
{
    // Glasslab libs
}

AA_Distiller.prototype.preProcess = function(sessionsEvents, currentResults)
{
    // Process data through distiller function
    console.log("Starting preProcess");

    var events = sessionsEvents[0];
    var eventsList = events.events;
    var results = currentResults.results;
    var standards = ["RI 6.8", "RI 7.8", "RI 8.8", "CCRA.R.1", "CCRA.R.8", "21st.RE", "21st.MJD"];

    // data structure which will replace the current results object
    // merges in current reports statuses or sets defaults if no report present
    var reportCardData = _buildReportCardData(results, standards);
    // used to make sure the updated achievements only progress in the approved order
    var achievementsHierarchy = _buildAchievementsHierarchy();
    // used to connect particular events to standards and achievements
    var eventStandardsMap = _buildEventStandardsMap();

    var action;
    var data;
    var value;
    var achievement;
    var standard;
    var status;

    _(eventsList).forEach(function(event){
        action = event.action;
        data = event.data;
        value = data.questId;

        if(eventStandardsMap[action] && eventStandardsMap[action][value]){
            achievement = eventStandardsMap[action][value];
            standard = achievement[0];
            achievement = achievement[1];
            status = reportCardData[standard].status;

            if(achievementsHierarchy[achievement] > achievementsHierarchy[status]){
                reportCardData[standard].status = achievement;
            }
        }
    });

    return reportCardData;
};

AA_Distiller.prototype.postProcess = function(distilled) {
    var standardsData;
    return standardsData;
};

function _buildReportCardData(results, standards){
    var distilledData = {};
    if(_.isEmpty(results)) {
        standards.forEach(function (standard) {
            distilledData[standard] = {status: "Not-Started"};
        });
    } else {
        _.merge(distilledData, results);
    }

    return distilledData;
}

function _buildAchievementsHierarchy(){
    var achievementsHierarchy = {};
    achievementsHierarchy["Not-Started"] = 0;
    achievementsHierarchy["In-Progress"] = 1;
    achievementsHierarchy["Watchout1"]   = 2;
    achievementsHierarchy["Partial"]     = 3;
    achievementsHierarchy["Watchout2"]   = 4;
    achievementsHierarchy["Full"]        = 5;

    return achievementsHierarchy;
}

function _buildEventStandardsMap(){
    var eventStandardsMap = {};
    var questStart = eventStandardsMap["Quest_start"] = {};
    var questComplete = eventStandardsMap["Quest_complete"] = {};

    //in progress
    questStart["Quest0-1"]    = ["RI 6.8", "In-Progress"];
    questStart["Quest0-5"]    = ["RI 7.8", "In-Progress"];
    questStart["Quest13"]     = ["RI 8.8", "In-Progress"];
    questStart["Quest1-1"]    = ["CCRA.R.1", "In-Progress"];
    questStart["Quest14"]     = ["CCRA.R.8", "In-Progress"];
    questComplete["Quest0-5"] = ["21st.RE", "In-Progress"];
    questStart["Quest0-6"]    = ["21st.MJD", "In-Progress"];

    // watchout1

    //partial
    questComplete["Quest0-3"] = ["RI 6.8", "Partial"];
    questComplete["Quest1-1"] = ["RI 7.8", "Partial"];
    questComplete["Quest18"]  = ["RI 8.8", "Partial"];
    //Calculation: (# of Fuse_core {data: weakness:none}) / (total # of Fuse_core)
    //Threshold: >.5
    questComplete["Quest0-6"] = ["CCRA.R.1", "Partial"];
    questComplete["Quest23"]  = ["CCRA.R.8", "Partial"];
    //Calculation: (# of Launch_attack {data: success:true}) / (total # of Launch_attack)
    //Threshold:_______
    questComplete["Quest14"]  = ["21st.RE", "Partial"];
    questComplete["Quest13"]  = ["21st.MJD", "Partial"];

    //watchout2

    //full
    questComplete["Quest0-5"] = ["RI 6.8", "Full"];
    questComplete["Quest14"] = ["RI 7.8", "Full"];
    questComplete["Quest21"]  = ["RI 8.8", "Full"];
    //Calculation: (# of Fuse_core {data: weakness:none}) / (total # of Fuse_core)
    //Threshold: >.5
    questComplete["Quest24"] = ["CCRA.R.1", "Full"];
    questComplete["Quest23a"]  = ["CCRA.R.8", "Full"];
    //Calculation: (# of Launch_attack {data: success:true}) / (total # of Launch_attack)
    //Threshold:______________
    questComplete["Quest21"]  = ["21st.RE", "Full"];
    questComplete["Quest24"]  = ["21st.MJD", "Full"];

    return eventStandardsMap;
}
