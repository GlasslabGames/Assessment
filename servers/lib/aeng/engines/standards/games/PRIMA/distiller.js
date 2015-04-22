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
    // Process data through distiller function
    console.log("Starting preProcess");

    var events = sessionsEvents[0];
    var eventsList = events.events;
    var results = currentResults.results;

    // needs development
    var reportCard = _buildReportCardData(results);
    // used to make sure the updated achievements only progress in the approved order
    var achievementsHierarchy = _buildAchievementsHierarchy();
    // needs development
    var eventStandardsMap = _buildEventStandardsMap();
    // questOrder may not apply to prima

    var action;
    var data;
    var achievement;
    var standard;
    var conditions;
    var status;

    _(eventsList).forEach(function(event){
    });

    reportCard.data = reportCard.data || [];
    reportCard.data = reportCard.data.concat(eventsList);
    return reportCard;
};

PRIMA_Distiller.prototype.postProcess = function(standardsData) {
    return standardsData;
};

function _buildReportCardData(results){
    var reportCard = {};
    if(_.isEmpty(results)) {
        // create default prima report structure
        //reportCard["RI 6.8"] = { status: "Not-Started", data: { failuresA: 0, lossesB: 0} };
        //reportCard["RI 7.8"] = { status: "Not-Started", data: { lossesA: 0, lossesB:0} };
        //reportCard["RI 8.8"] = { status: "Not-Started", data: { lossesA: 0, lossesB:0} };
        //reportCard["CCRA.R.1"] = { status: "Not-Started", data: { partialFuseCores: 0, partialStrongFuseCores: 0,
        //    fullFuseCores: 0, fullStrongFuseCores: 0, threshold: 0.5} };
        //reportCard["CCRA.R.8"] = { status: "Not-Started", data: { lossesA: 0} };
        //// this threshold is not determined in the google doc yet
        //reportCard["21st.RE"]  = { status: "Not-Started", data: { partialLaunchAttacks: 0, partialSuccessLaunchAttacks: 0,
        //    fullLaunchAttacks: 0, fullSuccessLaunchAttacks: 0, threshold: 0.5} };
        //reportCard["21st.MJD"] = { status: "Not-Started", data: { failuresA: 0, lossesB: 0} };
    } else {
        _.merge(reportCard, results);
    }

    return reportCard;
}

function _buildAchievementsHierarchy(){
    var achievementsHierarchy = {};
    achievementsHierarchy["Not-Started"] = 0;
    achievementsHierarchy["In-Progress"] = 1;
    achievementsHierarchy["WatchoutA"]   = 2;
    achievementsHierarchy["Partial"]     = 3;
    achievementsHierarchy["WatchoutB"]   = 4;
    achievementsHierarchy["Full"]        = 5;

    return achievementsHierarchy;
}

function _buildEventStandardsMap(){
    var eventStandardsMap = {};
    //correlate certain events with relevant standard and achievement
    //var questStart = eventStandardsMap["Quest_start"] = {};
    //var questComplete = eventStandardsMap["Quest_complete"] = {};
    //
    ////in progress
    //questStart["Quest0-1"]    = ["RI 6.8", "In-Progress"];
    //questStart["Quest0-5"]    = ["RI 7.8", "In-Progress"];
    //questStart["Quest13"]     = ["RI 8.8", "In-Progress"];
    //questStart["Quest1-1"]    = ["CCRA.R.1", "In-Progress"];
    //questStart["Quest14"]     = ["CCRA.R.8", "In-Progress"];
    //questComplete["Quest0-5"] = ["21st.RE", "In-Progress"];
    //questStart["Quest0-6"]    = ["21st.MJD", "In-Progress"];
    //
    //// watchout1
    //
    ////partial
    //questComplete["Quest0-3"] = ["RI 6.8", "Partial"];
    //questComplete["Quest1-1"] = ["RI 7.8", "Partial"];
    //questComplete["Quest18"]  = ["RI 8.8", "Partial"];
    ////Calculation: (# of Fuse_core {data: weakness:none}) / (total # of Fuse_core)
    ////Threshold: >.5
    //questComplete["Quest0-6"] = ["CCRA.R.1", "Partial"];
    //questComplete["Quest23"]  = ["CCRA.R.8", "Partial"];
    ////Calculation: (# of Launch_attack {data: success:true}) / (total # of Launch_attack)
    ////Threshold:_______
    //questComplete["Quest14"]  = ["21st.RE", "Partial"];
    //questComplete["Quest13"]  = ["21st.MJD", "Partial"];
    //
    ////watchout2
    //
    ////full
    //questComplete["Quest0-5"] = ["RI 6.8", "Full"];
    //questComplete["Quest14"] = ["RI 7.8", "Full"];
    //questComplete["Quest21"]  = ["RI 8.8", "Full"];
    ////Calculation: (# of Fuse_core {data: weakness:none}) / (total # of Fuse_core)
    ////Threshold: >.5
    //questComplete["Quest24"] = ["CCRA.R.1", "Full"];
    //questComplete["Quest23a"]  = ["CCRA.R.8", "Full"];
    ////Calculation: (# of Launch_attack {data: success:true}) / (total # of Launch_attack)
    ////Threshold:______________
    //questComplete["Quest21"]  = ["21st.RE", "Full"];
    //questComplete["Quest24"]  = ["21st.MJD", "Full"];

    return eventStandardsMap;
}