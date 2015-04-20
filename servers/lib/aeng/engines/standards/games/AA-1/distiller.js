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
    var reportCard = _buildReportCardData(results, standards);
    // used to make sure the updated achievements only progress in the approved order
    var achievementsHierarchy = _buildAchievementsHierarchy();
    // used to connect particular events to standards and achievements
    var eventStandardsMap = _buildEventStandardsMap();
    // used to correlate quest names in data to quest id
    var questMap = _buildQuestMap();
    // used to determine which quests occur before or after other quests
    var questOrder = _buildQuestOrder();

    var action;
    var data;
    var achievement;
    var standard;
    var conditions;
    var status;
    var ratio;
    var total;
    var good;
    var tally;

    _(eventsList).forEach(function(event){
        action = event.action;
        data = event.data;

        if(action === "Fuse_core" && data.weakness){
            standard = "CCRA.R.1";
            conditions = reportCard[standard];
            status = conditions.status;
            if(status !== "Full"){
                total = ++conditions.data.totalFuseCores;
                if(data.weakness === "none"){
                    good = ++conditions.data.strongFuseCores;
                } else{
                    good = conditions.data.strongFuseCores;
                }
                ratio = good/total;
                if(ratio < conditions.data.threshold){
                    if(achievementsHierarchy["WatchoutA"] > achievementsHierarchy[status]){
                        conditions.status = "WatchoutA";
                    }
                }
            }
        }

        if(action === "Launch_attack" && data.success !== undefined){
            standard = "21st.RE";
            conditions = reportCard[standard];
            status = conditions.status;
            if(achievementsHierarchy[status] < achievementsHierarchy["Partial"] &&
                questOrder[questMap[data.quest]] > questOrder["Quest0-5"] && questOrder[questMap[data.quest]] < questOrder["Quest16"]){
                total = ++conditions.data.partialLaunchAttacks;
                if(data.success === true){
                    good = ++conditions.data.partialSuccessLaunchAttacks;
                } else{
                    good = conditions.data.partialSuccessLaunchAttacks;
                }
                ratio = good/total;
                if(ratio < conditions.data.threshold){
                    conditions.status = "WatchoutA";
                }
            } else if(achievementsHierarchy[status] < achievementsHierarchy["Full"] &&
                questOrder[questMap[data.quest]] > questOrder["Quest14"] && questOrder[QuestMap[data.quest]] < questOrder["Quest23"]){
                total = ++conditions.data.fullLaunchAttacks;
                if(data.success === true){
                    good = ++conditions.data.fullSuccessLaunchAttacks;
                } else{
                    good = conditions.data.fullSuccessLaunchAttacks;
                }
                ratio = good/total;
                if(ratio < conditions.data.threshold){
                    conditions.status = "WatchoutB";
                }
            }
        }

        if(action === "Finish_battle" && data.success === false) {
            if (data.quest === "Build a Bot\r\n") {
                standard = "RI 6.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.losses;
                    if (tally > 2) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if (data.quest === "Which Protein?") {
                standards = "RI 7.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Partial"]) {
                    tally = ++conditions.data.losses1;
                    if (tally > 2) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if (data.quest === "Helpbots") {
                standards = "RI 7.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.losses2;
                    if (tally > 2) {
                        conditions.status = "WatchoutB";
                    }
                }
            } else if (data.quest === "Bot Trainer 5000") {
                standards = "RI 8.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Partial"]) {
                    tally = ++conditions.data.losses1;
                    if (tally > 2) {
                        conditions.status = "WatchoutA";
                    }
                }
            } else if(data.quest === "Hero Or Zero"){
                standards = "RI 8.8";
                conditions = reportCard[standard];
                status = conditions.status;
                if (achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
                    tally = ++conditions.data.losses2;
                    if (tally > 2) {
                        conditions.status = "WatchoutA";
                    }
                }
            }
            // still have a few watchouts to define
            //else if(data.quest === "Let's Evo"){
            //    standards = "CCRA.R.8";
            //    conditions = reportCard[standard];
            //    status = conditions.status;
            //    if (achievementsHierarchy[status] < achievementsHierarchy["Partial"]) {
            //        tally = ++conditions.data.losses;
            //        if (tally > 2) {
            //            conditions.status = "WatchoutA";
            //        }
            //    }
            //}
            //else if(data.quest === "Final Battle") {
            //    standards = "21st.MJD";
            //    conditions = reportCard[standard];
            //    status = conditions.status;
            //    if (achievementsHierarchy[status] < achievementsHierarchy["Full"]) {
            //        tally = ++conditions.data.losses;
            //        if (tally > 2) {
            //            conditions.status = "WatchoutB";
            //        }
            //    }
            //}
        }

        //if(achievementsHierarchy[status] < achievementsHierarchy["Partial"]){
        //    tally = ++conditions.data.failures;
        //    if(tally > 3){
        //        conditions.status = "WatchoutA";
        //    }
        //}

        if(data.questId && eventStandardsMap[action] && eventStandardsMap[action][data.questId]){
            achievement = eventStandardsMap[action][data.questId];
            standard = achievement[0];
            achievement = achievement[1];
            conditions = reportCard[standard];
            status = conditions.status;

            if(achievementsHierarchy[achievement] > achievementsHierarchy[status]){
                if(!conditions.data.threshold){
                    conditions.status = achievement;
                } else{
                    ratio = _findThresholdRatio(conditions, standard, achievement);
                    if(ratio >= conditions.data.threshold){
                        conditions.status = achievement;
                    }
                }
            }
        }
    });

    return reportCard;
};

AA_Distiller.prototype.postProcess = function(distilled) {
    var standardsData;
    return standardsData;
};

function _buildReportCardData(results, standards){
    var reportCard = {};
    if(_.isEmpty(results)) {
        reportCard["RI 6.8"] = { status: "Not-Started", data: { failures: 0, losses: 0} };
        reportCard["RI 7.8"] = { status: "Not-Started", data: { losses1: 0, losses2:0} };
        reportCard["RI 8.8"] = { status: "Not-Started", data: { losses1: 0, losses2:0} };
        reportCard["CCRA.R.1"] = { status: "Not-Started", data: { partialFuseCores: 0, partialStrongFuseCores: 0,
                                    fullFuseCores: 0, fullStrongFuseCores: 0, threshold: 0.5} };
        reportCard["CCRA.R.8"] = { status: "Not-Started", data: { losses: 0, failures: 0} };
        // this threshold is not determined in the google doc yet
        reportCard["21st.RE"]  = { status: "Not-Started", data: { partialLaunchAttacks: 0, partialSuccessLaunchAttacks: 0,
                                    fullLaunchAttacks: 0, fullSuccessLaunchAttacks: 0, threshold: 0.5} };
        reportCard["21st.MJD"] = { status: "Not-Started", data: { failures: 0, losses: 0} };
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

function _findThresholdRatio(conditions, standard, achievement){
    var data = conditions.data;
    var ratio;
    if(standard === "CCRA.R.1"){
        if(achievement === "Partial"){
            ratio = data.partialStrongFuseCores/data.partialFuseCores;

        } else if(achievement === "Full"){
            ratio = data.fullStrongFuseCores/data.fullFuseCores;
        }
    } else if(standard === "21st.RE"){
        if(achievement === "Partial"){
            ratio = data.partialSuccessLaunchAttacks/data.partialLaunchAttacks;
        } else if(achievement === "Full"){
            ratio = data.fullSuccessLaunchAttacks/data.fullLaunchAttacks;
        }
    }
    return ratio;
}

function _buildQuestMap(){
    var map = {};
    //quest_complete and quest_cancel have quest value of interstitial, likely meaning between quest activity
    // otherwise these map to questIds.
    map["Welcome!"] = "Quest0-1";
    //conflict
    //map["Talk to Lucas"] = "Quest0-2";
    map["Choose Your Argubot"] = "Quest0-3";
    map["The Rec Room"] = "Quest0-4";
    map["Build a Bot\r\n"] = "Quest0-5";
    //more training and which protein out of order
    map["Which Protein?"] = "Quest1-1";
    map["More Training!"] = "Quest0-6";
    map["Missing Evidence"] = "Quest11";
    map["Level Up\r!"] = "Quest13";
    map["Helpbots"] = "Quest14";
    map["Chloe's Lost Her Marbles"] = "Quest16";
    map["Bot Trainer 5000"] = "Quest18";
    //conflict
    map["Talk to Lucas"] = "Quest19";
    map["Hero or Zero?"] = "Quest21";
    map["Let's Evo-2"] = "Quest23";
    map["Brackett City Objectives"] = "Quest24";
    map["Lev's Missing Data Cube"] = "Quest26";
    map["What to do about Lucas"] = "Quest28";
    map["Adrian's Project"] = "Quest30";
    map["Pet Decision"] = "Quest33";
    map["Help SAM"] = "Quest34";

    return map;
}

function _buildQuestOrder(){
    var questOrder = {};
    questOrder["Quest0-1"] = 1;
    questOrder["Quest0-2"] = 2;
    questOrder["Quest0-3"] = 3;
    questOrder["Quest0-4"] = 4;
    questOrder["Quest0-5"] = 5;
    questOrder["Quest1-1"] = 6;
    questOrder["Quest0-6"] = 7;
    questOrder["Quest11"] = 8;
    questOrder["Quest13"] = 9;
    questOrder["Quest14"] = 10;
    questOrder["Quest16"] = 11;
    questOrder["Quest18"] = 12;
    questOrder["Quest19"] = 13;
    questOrder["Quest21"] = 14;
    questOrder["Quest23"] = 15;
    questOrder["Quest24"] = 16;
    questOrder["Quest26"] = 17;
    questOrder["Quest28"] = 18;
    questOrder["Quest30"] = 19;
    questOrder["Quest33"] = 20;
    questOrder["Quest34"] = 21;

    return questOrder;
}
