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
    var firstResults = reportCard.firstResults;

    var name;
    var level;
    var success;
    var attempts;
    var timestamp;

    _(eventsList).forEach(function(event){
        name = event.name;
        if(name === "submit_answer"){
            level = event.gameLevel;
            if(!firstResults[level]){
                success = event.eventData.success;
                attempts = event.eventData.attempt_count;
                timestamp = event.timestamp;
                if(success && attempts === 1){
                    firstResults[level] = { success: true, timestamp: timestamp };
                } else{
                    firstResults[level] = { success: false, timestamp: timestamp };
                }
            }
        }
    });

    if(reportCard.day < 3 ){
        _day3Check(reportCard, firstResults);
    }
    if(reportCard.day === 3){
        _day4Check(reportCard, firstResults);
    }
    if(reportCard.day === 4){
        _day5Check(reportCard, firstResults);
    }

    return reportCard;
};

PRIMA_Distiller.prototype.postProcess = function(standardsData) {
    return standardsData;
};

function _buildReportCardData(results){
    var reportCard = {};
    if(_.isEmpty(results)) {
        // if one, two, three fields refer to questions in the progression which have not yet been done.
        // if one, two, or three are marked false, the user missed the problem on first attempt
        // if one, two, or three are marked true, the user got the problem right on first attempt
        var days;
        reportCard["6.RP.A.1"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.1"].days;
        days[3] = {status: "Not-Started", one: null, two: null, three: null };
        days[4] = {status: "Not-Started", one: null, two: null, three: null };
        days[5] = {status: "Not-Started", one: null, two: null, three: null };

        reportCard["6.RP.A.2"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.2"].days;
        days[3] = {status: "Not-Started", one: null, two: null, three: null };
        days[4] = {status: "Not-Started", one: null, two: null, three: null };
        days[5] = {status: "Not-Started", one: null, two: null, three: null };

        reportCard["6.RP.A.3"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.3"].days;
        days[3] = {status: "Not-Started", one: null, two: null, three: null };
        days[4] = {status: "Not-Started", one: null, two: null, three: null };
        days[5] = {status: "Not-Started", one: null, two: null, three: null };

        reportCard["6.RP.A.3.A"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.3.A"].days;
        days[3] = {status: "Not-Started", one: null, two: null, three: null };
        days[4] = {status: "Not-Started", one: null, two: null, three: null };
        days[5] = {status: "Not-Started", one: null, two: null, three: null };

        // keeps track of how a user did on the first try for each problem. key is problem name. values listed below
        // if true, user succeeded on first try
        // if false, user failed on first try
        // if null, user has attempted an analogous problem, so this one should not be considered
        reportCard["firstResults"] = {};
        // the day parameter mentions which day the standard refers to to derive the status value.
        // day is initialized to 0, after that it is replaced by the last complete day starting with day 3.
        reportCard.day = 0;
    } else {
        _.merge(reportCard, results);
    }

    return reportCard;
}

function _day3Check(reportCard, firstResults){
    // each input is a tuple, that records the problem name and the user's success value on first attempt
    var standards = ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"];

    var addResultToDay = _addResultToDay.bind(reportCard);
    var addStatusToDayStandards = _addStatusToDayStandards.bind(reportCard);
    var event;
    if(firstResults["1.05b"]){
        if(firstResults["1.05b"].success){
            addResultToDay("one", 3, true);
            event = _findFirstEvent([firstResults["1.07a"], firstResults["1.08"], firstResults["1.09"]]);
            if(event && event.success){
                addResultToDay("two", 3, true);
                if(firstResults["1.06"] && firstResults["1.06"].success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("Full", ["6.RP.A.1","6.RP.A.2"], "day3");
                    addStatusToDayStandards("Partial", ["6.RP.A.3","6.RP.A.3.A"], "day3");
                }
            } else if(event && event.success === false){
                addResultToDay("two", 3, false);
                if(firstResults["1.07b"] && firstResults["1.07b"].success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("Full", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("Partial", ["6.RP.A.2"], 3);
                }
            }
        } else if(firstResults["1.05b"].success === false){
            addResultToDay("one", 3, false);

        }
    }
    return eventStandardsMap;
}

function _day4Check(reportCard, firstResults){

}

function _day5Check(reportCard, firstResults){
    
}

function _addResultToDay(problemNumber, day, success){
    var dayResults;
    _(this).forEach(function(standard){
        dayResults = standard.days[day];
        dayResults[problemNumber] = success;
    });
}

function _addStatusToDayStandards(status, standards, day){
    standards = _arrayToObjKeys(standards);
    _(this).forEach(function(standard, key){
        if(standards[key]){
            standard.days[day].status = status;
            standard.status = status;
        }
    });
    this.day = day;
}

function _arrayToObjKeys(array){
    var obj = {};
    _(array).forEach(function(value){
        obj[value] = true;
    });
    return obj;
}

function _findFirstEvent(events){
    var first;
    _(events).forEach(function(event){
        first = first || event.timestamp;
        if( event && event.timestamp < first.timestamp){
            first = event;
        }
    });
    _(events).forEach(function(event){
        if(event && first && event.timestamp !== first.timestamp){
            event.status = null;
        }
    });
    return first;
}
