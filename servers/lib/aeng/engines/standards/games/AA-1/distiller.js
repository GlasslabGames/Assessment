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

    // data structure which will replace the current results object
    // merges in current reports statuses or sets defaults if no report present
    var reportCard = _buildReportCardData(results);
    // used to make sure the updated achievements only progress in the approved order
    var achievementsHierarchy = _buildAchievementsHierarchy();
    // used to connect particular events to standards and achievements
    var eventStandardsMap = _buildEventStandardsMap();
    // used to determine which quests occur before or after other quests
    var questOrder = _buildQuestOrder();

    var action;
    var data;
    var achievement;
    var standard;
    var conditions;
    var status;
    var tally;
    var quest;
    var questId;

    _(eventsList).forEach(function(event){
        action = event.eventName;
        data = event.eventData;
        quest = data.quest;
        questId = data.questId;

        if(action === "Fuse_core" && data.weakness){
            standard = "CCRA.R.1";
            conditions = reportCard[standard];
            status = conditions.status;
            if(achievementsHierarchy[status] < achievementsHierarchy["WatchoutA"] &&
                questOrder[quest] < questOrder["Quest11"]){
                conditions.data.partialFuseCores++;
                if(data.weakness === "none"){
                    conditions.data.partialStrongFuseCores++;
                }
            } else if(achievementsHierarchy[status] < achievementsHierarchy["WatchoutB"] &&
                questOrder[quest] > questOrder["Quest0-6"] && questOrder[quest] < questOrder["Quest26"]){
                conditions.data.fullFuseCores++;
                if(data.weakness === "none"){
                    conditions.data.fullStrongFuseCores++;
                }
            }
        }

        if(action === "Launch_attack" && data.success !== undefined){
            standard = "21st.RE";
            conditions = reportCard[standard];
            status = conditions.status;
            if(achievementsHierarchy[status] < achievementsHierarchy["WatchoutA"] && quest !== "interstitial" &&
                questOrder[quest] < questOrder["Quest16"]){
                conditions.data.partialLaunchAttacks++;
                if(data.success === true){
                    conditions.data.partialSuccessLaunchAttacks++;
                }
            } else if(achievementsHierarchy[status] < achievementsHierarchy["WatchoutB"] && quest !== "interstitial" &&
                questOrder[quest] > questOrder["Quest14"] && questOrder[quest] < questOrder["Quest23"]){
                conditions.data.fullLaunchAttacks++;
                if(data.success === true){
                    conditions.data.fullSuccessLaunchAttacks++;
                }
            }
        }

        if(action === "Finish_battle" && data.success === false) {
            if(quest === "Quest0-5") {
                // Build a Bot
                standard = "RI 6.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.lossesB;
                    if(tally >= 3) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if(quest === "Quest1-1") {
                // Which Protein
                standard = "RI 7.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Partial"]) {
                    tally = ++conditions.data.lossesA;
                    if(tally >= 3) {
                        conditions.status = "WatchoutA";
                    }
                }
            } else if(quest === "Quest14") {
                // Helpbots
                standard = "RI 7.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.lossesB;
                    if(tally >= 3) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if(quest === "Quest18") {
                // Bot Trainer 5000
                standard = "RI 8.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Partial"]) {
                    tally = ++conditions.data.lossesA;
                    if(tally >= 3) {
                        conditions.status = "WatchoutA";
                    }
                }
            } else if(quest === "Quest21"){
                // Hero Or Zero?
                standard = "RI 8.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.lossesB;
                    if(tally >= 3) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if(quest === "Quest23"){
                // Let's Evo-2
                standard = "CCRA.R.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Partial"]){
                    tally = ++conditions.data.lossesA;
                    if(tally >= 3){
                        conditions.status = "WatchoutA";
                    }
                }
            } else if(quest === "Quest24"){
                // Brackett City Objectives
                standard = "21st.MJD";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Full"]){
                    tally = ++conditions.data.lossesB;
                    if(tally >= 3){
                        conditions.status = "WatchoutB";
                    }
                }
            }
        }
        if(action === "Give_schemeTrainingEvidence" && data.success === false){
            if(quest === "Quest0-3"){
                // Choose Your Argubot
                standard = "RI 6.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Partial"]){
                    tally = ++conditions.data.failuresA;
                    if(tally >= 3){
                        conditions.status = "WatchoutA";
                    }
                }
            } else if(quest === "Quest13"){
                // this quest names is not unique
                // Level Up!
                standard = "21st.MJD";
                conditions = reportCard[standard];
                status = conditions.status;
                if(achievementsHierarchy[status] < achievementsHierarchy["Partial"]){
                    tally = ++conditions.data.failuresA;
                    if(tally >= 4){
                        conditions.status = "WatchoutA";
                    }
                }
            }
        }

        if(questId && eventStandardsMap[action] && eventStandardsMap[action][questId]){
            achievement = eventStandardsMap[action][questId];
            standard = achievement[0];
            achievement = achievement[1];
            conditions = reportCard[standard];
            status = conditions.status;

            if(achievementsHierarchy[achievement] > achievementsHierarchy[status]){
                if(!conditions.data.threshold){
                    conditions.status = achievement;
                } else{
                    _assessThresholdRatio(conditions, standard, achievement);
                }
            }
        }
    });

    return reportCard;
};

AA_Distiller.prototype.postProcess = function(standardsData) {
    return standardsData;
};

function _buildReportCardData(results){
    var reportCard = {};
    if(_.isEmpty(results)) {
        reportCard["RI 6.8"] = { status: "Not-Started", data: { failuresA: 0, lossesB: 0} };
        reportCard["RI 7.8"] = { status: "Not-Started", data: { lossesA: 0, lossesB:0} };
        reportCard["RI 8.8"] = { status: "Not-Started", data: { lossesA: 0, lossesB:0} };
        reportCard["CCRA.R.1"] = { status: "Not-Started", data: { partialFuseCores: 0, partialStrongFuseCores: 0,
                                    fullFuseCores: 0, fullStrongFuseCores: 0, threshold: 0.5} };
        reportCard["CCRA.R.8"] = { status: "Not-Started", data: { lossesA: 0} };
        // this threshold is not determined in the google doc yet
        reportCard["21st.RE"]  = { status: "Not-Started", data: { partialLaunchAttacks: 0, partialSuccessLaunchAttacks: 0,
                        partialThreshold: 0.4, fullLaunchAttacks: 0, fullSuccessLaunchAttacks: 0, fullThreshold: 0.45} };
        reportCard["21st.MJD"] = { status: "Not-Started", data: { failuresA: 0, lossesB: 0} };
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

function _assessThresholdRatio(conditions, standard, achievement){
    var data = conditions.data;
    var ratio;
    if(standard === "CCRA.R.1"){
        if(achievement === "Partial"){
            ratio = data.partialStrongFuseCores/data.partialFuseCores;
            if(ratio >= data.threshold){
                conditions.status = achievement;
            } else{
                conditions.status = "WatchoutA";
            }
        } else if(achievement === "Full"){
            ratio = data.fullStrongFuseCores/data.fullFuseCores;
            if(ratio >= data.threshold){
                conditions.status = achievement;
            } else {
                conditions.status = "WatchoutB";
            }
        }
    } else if(standard === "21st.RE"){
        if(achievement === "Partial"){
            ratio = data.partialSuccessLaunchAttacks/data.partialLaunchAttacks;
            if(ratio >= data.partialThreshold){
                conditions.status = achievement;
            } else{
                conditions.status = "WatchoutA";
            }
        } else if(achievement === "Full"){
            ratio = data.fullSuccessLaunchAttacks/data.fullLaunchAttacks;
            if(ratio >= data.fullThreshold){
                conditions.status = achievement;
            } else{
                conditions.status = "WatchoutB";
            }
        }
    }
}

function _buildQuestOrder(){
    var questOrder = {};
    questOrder["Quest0-1"] = 0;
    questOrder["Quest0-2"] = 1;
    questOrder["Quest0-3"] = 2;
    questOrder["Quest0-4"] = 3;
    questOrder["Quest0-5"] = 4;
    questOrder["Quest1-1"] = 5;
    questOrder["Quest0-6"] = 6;
    questOrder["Quest11"]  = 7;
    questOrder["Quest13"]  = 8;
    questOrder["Quest14"]  = 9;
    questOrder["Quest16"]  = 10;
    questOrder["Quest18"]  = 11;
    questOrder["Quest19"]  = 12;
    questOrder["Quest21"]  = 13;
    questOrder["Quest23"]  = 14;
    questOrder["Quest23a"] = 15;
    questOrder["Quest24"]  = 16;
    questOrder["Quest26"]  = 17;
    questOrder["Quest28"]  = 18;
    questOrder["Quest30"]  = 19;
    questOrder["Quest33"]  = 20;
    questOrder["Quest34"]  = 21;

    return questOrder;
}
