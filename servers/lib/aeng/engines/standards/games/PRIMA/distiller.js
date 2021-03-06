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

    // data structure which will replace the current results object
    // merges in current reports statuses or sets defaults if no report present
    var reportCard = _buildReportCardData(results);
    // stored results of user's doing assessed problems on first attempt
    var firstResults = reportCard.firstResults;
    // map that indicates which problems need to be stored for assessment purposes
    var gradedProblems = _buildGradedProblems();

    var name;
    var level;
    var success;
    var attempts;
    var timestamp;

    _(eventsList).forEach(function(event){
        name = event.eventName;
        if(name === "submit_answer"){
            level = event.gameLevel;
            if(gradedProblems[level] && !firstResults[level]){
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

    if(reportCard.day < 3){
        _day3Check(reportCard, firstResults);
    }
    if(reportCard.day < 4){
        _day4Check(reportCard, firstResults);
    }
    if(reportCard.day < 5){
        _day5Check(reportCard, firstResults);
    }
    if(reportCard.day < 6){
        _day6Check(reportCard, firstResults);
    }

    return reportCard;
};

PRIMA_Distiller.prototype.postProcess = function(standardsData) {
    return standardsData;
};

function _buildReportCardData(results){
    var reportCard = {};
    if(_.isEmpty(results)) {

        var days;
        // holds status for each day
        // if status is Not-Started on a later day, always use status from earlier day
        // otherwise, use latest day status
        reportCard["6.RP.A.1"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.1"].days;
        days[3] = { status: "Not-Started" };
        days[4] = { status: "Not-Started" };
        days[5] = { status: "Not-Started" };
        days[6] = { status: "Not-Started" };

        reportCard["6.RP.A.2"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.2"].days;
        days[3] = { status: "Not-Started" };
        days[4] = { status: "Not-Started" };
        days[5] = { status: "Not-Started" };
        days[6] = { status: "Not-Started" };

        reportCard["6.RP.A.3"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.3"].days;
        days[3] = { status: "Not-Started" };
        days[4] = { status: "Not-Started" };
        days[5] = { status: "Not-Started" };
        days[6] = { status: "Not-Started" };

        reportCard["6.RP.A.3.A"] = { status: "Not-Started", days: {} };
        days = reportCard["6.RP.A.3.A"].days;
        days[3] = { status: "Not-Started" };
        days[4] = { status: "Not-Started" };
        days[5] = { status: "Not-Started" };
        days[6] = { status: "Not-Started" };

        // keeps track of how a user did on the first try for important problem. key is problem name. values listed below
        // if true, user succeeded on first try
        // if false, user failed on first try
        // if null, user has attempted an analogous problem, so this one should not be considered
        reportCard["firstResults"] = {};
        // the day parameter mentions which day the user has most recently finished
        // day is initialized to 0, after that it is replaced by the last complete day starting with day 3.
        reportCard.day = 0;

        // if one, two, three fields are marked null, this refers to questions in the progression which have not yet been done.
        // if one, two, or three fields are marked false, the user missed the problem on first attempt
        // if one, two, or three fields are marked true, the user got the problem right on first attempt
        days = reportCard.days = {};
        days[3] = { one: null, two: null, three: null };
        days[4] = { one: null, two: null, three: null };
        days[5] = { one: null, two: null, three: null };
        days[6] = { one: null, two: null, three: null };
    } else {
        _.merge(reportCard, results);
    }

    return reportCard;
}

function _day3Check(reportCard, firstResults){

    var addResultToDay = _addResultToDay.bind(reportCard);
    var addStatusToDayStandards = _addStatusToDayStandards.bind(reportCard);
    var event;
    if(firstResults["1.05b"]){
        if(firstResults["1.05b"].success){
            addResultToDay("one", 3, true);
            event = _findFirstEvent([firstResults["1.07a"], firstResults["1.07c"], firstResults["1.07d"]]);
            if(event && event.success){
                addResultToDay("two", 3, true);
                if(firstResults["1.06"] && firstResults["1.06"].success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("FullA", ["6.RP.A.1","6.RP.A.2"], 3);
                    addStatusToDayStandards("PartialA", ["6.RP.A.3","6.RP.A.3.A"], 3);
                } else if(firstResults["1.06"] && firstResults["1.06"].success === false){
                    addResultToDay("three", 3, false);
                    addStatusToDayStandards("FullA", ["6.RP.A.1", "6.RP.A.2"], 3);
                    addStatusToDayStandards("PartialA", ["6.RP.A.3", "6.RP.A.3.A"], 3);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 3, false);
                event = _findFirstEvent([firstResults["1.09c"], firstResults["1.09a"], firstResults["1.09d"]]);
                if(event && event.success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("FullA", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("PartialA", ["6.RP.A.2"], 3);
                } else if(event && event.success === false){
                    addResultToDay("three", 3, false);
                    addStatusToDayStandards("PartialA", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("WatchoutA", ["6.RP.A.2"], 3);
                }
            }
        } else if(firstResults["1.05b"].success === false){
            addResultToDay("one", 3, false);
            event = _findFirstEvent([firstResults["1.03c"], firstResults["1.03a"]]);
            if(event && event.success){
                addResultToDay("two", 3, true);
                event = _findFirstEvent([firstResults["1.07a"], firstResults["1.07c"], firstResults["1.07d"]]);
                if(event && event.success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("FullA", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("PartialA", ["6.RP.A.2"], 3);
                } else if(event && event.success === false){
                    addResultToDay("three", 3, false);
                    addStatusToDayStandards("PartialA", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("WatchoutA", ["6.RP.A.2"], 3);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 3, false);
                event = _findFirstEvent([firstResults["1.02b"], firstResults["1.02c"]]);
                if(event && event.success){
                    addResultToDay("three", 3, true);
                    addStatusToDayStandards("PartialA", ["6.RP.A.1"], 3);
                    addStatusToDayStandards("WatchoutA", ["6.RP.A.2"], 3);
                } else if(event && event.success === false){
                    addResultToDay("three", 3, false);
                    addStatusToDayStandards("WatchoutA", ["6.RP.A.1", "6.RP.A.2"], 3);
                }
            }
        }
    }
}

function _day4Check(reportCard, firstResults){
    var addResultToDay = _addResultToDay.bind(reportCard);
    var addStatusToDayStandards = _addStatusToDayStandards.bind(reportCard);
    var event;
    if(firstResults["2.01c"]){
        if(firstResults["2.01c"].success){
            addResultToDay("one", 4, true);
            event = _findFirstEvent([firstResults["2.05a"], firstResults["2.05c"], firstResults["2.05d"]]);
            if(event && event.success){
                addResultToDay("two", 4, true);
                if(firstResults["2.06b"] && firstResults["2.06b"].success){
                    addResultToDay("three", 4, true);
                    addStatusToDayStandards("FullB", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3"], 4);
                    addStatusToDayStandards("PartialB", ["6.RP.A.3.A"], 4);
                } else if(firstResults["2.06b"] && firstResults["2.06b"].success === false){
                    addResultToDay("three", 4, false);
                    addStatusToDayStandards("FullB", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3"], 4);
                    addStatusToDayStandards("PartialB", ["6.RP.A.3.A"], 4);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 4, false);
                event = _findFirstEvent([firstResults["2.06a"], firstResults["2.06d"], firstResults["2.06e"]]);
                if(event && event.success){
                    addResultToDay("three", 4, true);
                    addStatusToDayStandards("FullB", ["6.RP.A.1", "6.RP.A.2"], 4);
                    addStatusToDayStandards("PartialB", ["6.RP.A.3", "6.RP.A.3.A"], 4);
                } else if(event && event.success === false){
                    addResultToDay("three", 4, false);
                    addStatusToDayStandards("PartialB", ["6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"]);
                }
            }
        } else if(firstResults["2.01c"].success === false){
            addResultToDay("one", 4, false);
            event = _findFirstEvent([firstResults["2.02a"], firstResults["2.02c"]]);
            if(event && event.success){
                addResultToDay("two", 4, true);
                event = _findFirstEvent([firstResults["2.05a"], firstResults["2.05c"], firstResults["2.05d"]]);
                if(event && event.success){
                    addResultToDay("three", 4, true);
                    addStatusToDayStandards("FullB", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3"], 4);
                    addStatusToDayStandards("PartialB", ["6.RP.A.3.A"], 4);
                } else if(event & event.success === false){
                    addResultToDay("three", 4, false);
                    addStatusToDayStandards("PartialB", ["6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"], 4);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 4, false);
                event = _findFirstEvent([firstResults["2.01a"], firstResults["2.01b"]]);
                if(event && event.success){
                    addResultToDay("three", 4, true);
                    addStatusToDayStandards("PartialB", ["6.RP.A.2"], 4);
                    addStatusToDayStandards("WatchoutB", ["6.RP.A.3", "6.RP.A.3.A"], 4);
                } else if(event && event.success === false){
                    addResultToDay("three", 4, false);
                    addStatusToDayStandards("WatchoutB", ["6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"], 4);
                }
            }
        }
    }
}

function _day5Check(reportCard, firstResults){
    var addResultToDay = _addResultToDay.bind(reportCard);
    var addStatusToDayStandards = _addStatusToDayStandards.bind(reportCard);
    var event;
    if(firstResults["3.01b"]){
        if(firstResults["3.01b"].success){
            addResultToDay("one", 5, true);
            event = _findFirstEvent([firstResults["3.03b"], firstResults["3.03e"], firstResults["3.03f"]]);
            if(event && event.success){
                addResultToDay("two", 5, true);
                if(firstResults["3.03d"] && firstResults["3.03d"].sucess){
                    addResultToDay("three", 5, true);
                    addStatusToDayStandards("FullC", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3.A"], 5);
                } else if(firstResults["3.03d"] && firstResults["3.03d"].success === false){
                    addResultToDay("three", 5, false);
                    addStatusToDayStandards("FullC", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3.A"], 5);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 5, false);
                event = _findFirstEvent([firstResults["3.03a"], firstResults["3.03c"], firstResults["3.03h"]]);
                if(event && event.success){
                    addResultToDay("three", 5, true);
                    addStatusToDayStandards("FullC", ["6.RP.A.1"], 5);
                    addStatusToDayStandards("PartialC", ["6.RP.A.2", "6.RP.A.3.A"], 5);
                } else if(event && event.success === false){
                    addResultToDay("three", 5, false);
                    addStatusToDayStandards("PartialC", ["6.RP.A.2"], 5);
                    addStatusToDayStandards("WatchoutC", ["6.RP.A.3.A"], 5);
                }
            }
        } else if(firstResults["3.01b"].success === false){
            addResultToDay("one", 5, false);
            event = _findFirstEvent([firstResults["3.01a"], firstResults["3.01c"]]);
            if(event && event.success){
                addResultToDay("two", 5, true);
                event = _findFirstEvent([firstResults["3.03b"], firstResults["3.03e"], firstResults["3.03f"]]);
                if(event && event.success){
                    addResultToDay("three", 5, true);
                    addStatusToDayStandards("FullC", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3.A"]);
                } else if(event && event.success === false){
                    addResultToDay("three", 5, false);
                    addStatusToDayStandards("PartialC", ["6.RP.A.2"], 5);
                    addStatusToDayStandards("WatchoutC", ["6.RP.A.3.A"], 5);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 5, false);
                event = _findFirstEvent([firstResults["3.01d"], firstResults["3.01e"]]);
                if(event && event.success){
                    addResultToDay("three", 5, true);
                    addStatusToDayStandards("PartialC", ["6.RP.A.2"], 5);
                    addStatusToDayStandards("WatchoutC", ["6.RP.A.3.A"], 5);
                } else if(event && event.success === false){
                    addResultToDay("three", 5, false);
                    addStatusToDayStandards("WatchoutC", ["6.RP.A.2", "6.RP.A.3.A"], 5);
                }
            }
        }
    }
}

function _day6Check(reportCard, firstResults){
    var addResultToDay = _addResultToDay.bind(reportCard);
    var addStatusToDayStandards = _addStatusToDayStandards.bind(reportCard);
    var event;
    if(firstResults["4.03c"]){
        if(firstResults["4.03c"].success){
            addResultToDay("one", 6, true);
            event = _findFirstEvent([firstResults["4.11a"], firstResults["4.11b"], firstResults["4.10a"], firstResults["4.10b"]]);
            if(event && event.success){
                addResultToDay("two", 6, true);
                if(firstResults["4.13"] && firstResults["4.13"].success){
                    addResultToDay("three", 6, true);
                    addStatusToDayStandards("FullD", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"], 6);
                } else if(firstResults["4.13"] && firstResults["4.13"].success === false){
                    addResultToDay("three", 6, false);
                    addStatusToDayStandards("FullD", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"], 6);
                }
            } else if(event && event.success === false){
                addResultToDay("two", 6, false);
                event = _findFirstEvent([firstResults["4.08a"], firstResults["4.08b"], firstResults["4.18a"], firstResults["4.18b"]]);
                if(event && event.success){
                    addResultToDay("three", 6, true);
                    addStatusToDayStandards("FullD", ["6.RP.A.1", "6.RP.A.2"], 6);
                    addStatusToDayStandards("PartialD", ["6.RP.A.3", "6.RP.A.3.A"], 6);
                } else if(event && event.success === false){
                    addResultToDay("three", 6, false);
                    addStatusToDayStandards("PartialD", ["6.RP.A.3"], 6);
                    addStatusToDayStandards("WatchoutD", ["6.RP.A.3.A"], 6);
                }
            }
        } else if(firstResults["4.03c"].success === false){
            addResultToDay("one", 6, false);
            event = _findFirstEvent([firstResults["4.04a"], firstResults["4.04b"]]);
            if(event && event.success){
                addResultToDay("two", 6, true);
                event = _findFirstEvent([firstResults["4.11a"], firstResults["4.11b"], firstResults["4.10a"], firstResults["4.10b"]]);
                if(event && event.success){
                    addResultToDay("three", 6, true);
                    addStatusToDayStandards("FullD", ["6.RP.A.1", "6.RP.A.2", "6.RP.A.3", "6.RP.A.3.A"], 6);
                } else if(event && event.success === false){
                    addResultToDay("three", 6, false);
                    addStatusToDayStandards("PartialD", ["6.RP.A.3"], 6);
                    addStatusToDayStandards("WatchoutD", ["6.RP.A.3.A"], 6);
                }
            } else if(event && event.success === false){
                event = _findFirstEvent([firstResults["4.03a"], firstResults["4.03b"]]);
                if(event && event.success){
                    // this two add refers to level 4.04a
                    addResultToDay("two", 6, false);
                    // this three add refers to the 4.03s
                    addResultToDay("three", 6, true);
                    addStatusToDayStandards("WatchoutD", ["6.RP.A.3", "6.RP.A.3.A"], 6);
                } else if(event && event.success === false){
                    // this two refers to the 4.03s
                    addResultToDay("two", 6, false);
                    event = _findFirstEvent([firstResults["4.08a"], firstResults["4.08b"], firstResults["4.18a"], firstResults["4.18b"]]);
                    if(event && event.success === false) {
                        addResultToDay("three", 6, false);
                        addStatusToDayStandards("WatchoutD", ["6.RP.A.3", "6.RP.A.3.A"], 6);
                    }
                }
            }
        }
    }
}

function _addResultToDay(problemNumber, day, success){
    this.days[day][problemNumber] = success;
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
        first = first || event;
        if( event && event.timestamp < first.timestamp){
            first = event;
        }
    });
    _(events).forEach(function(event){
        if(event && first && event.timestamp !== first.timestamp){
            event.success = null;
        }
    });
    return first;
}

function _buildGradedProblems(){
    var gradedProblems = {};
    // day 3
    gradedProblems["1.05b"] = true;
    gradedProblems["1.03c"] = true;
    gradedProblems["1.03a"] = true;
    gradedProblems["1.02b"] = true;
    gradedProblems["1.02c"] = true;
    gradedProblems["1.09c"] = true;
    gradedProblems["1.09a"] = true;
    gradedProblems["1.09d"] = true;
    gradedProblems["1.07a"] = true;
    gradedProblems["1.07c"] = true;
    gradedProblems["1.07d"] = true;
    gradedProblems["1.06"]  = true;
    // day 4
    gradedProblems["2.01c"] = true;
    gradedProblems["2.02a"] = true;
    gradedProblems["2.02c"] = true;
    gradedProblems["2.01a"] = true;
    gradedProblems["2.01b"] = true;
    gradedProblems["2.06a"] = true;
    gradedProblems["2.06d"] = true;
    gradedProblems["2.06e"] = true;
    gradedProblems["2.05a"] = true;
    gradedProblems["2.05c"] = true;
    gradedProblems["2.05d"] = true;
    gradedProblems["2.06b"] = true;
    // day 5
    gradedProblems["3.01b"] = true;
    gradedProblems["3.01a"] = true;
    gradedProblems["3.01c"] = true;
    gradedProblems["3.01d"] = true;
    gradedProblems["3.01e"] = true;
    gradedProblems["3.03a"] = true;
    gradedProblems["3.03c"] = true;
    gradedProblems["3.03h"] = true;
    gradedProblems["3.03b"] = true;
    gradedProblems["3.03e"] = true;
    gradedProblems["3.03f"] = true;
    gradedProblems["3.03d"] = true;
    // day 6
    gradedProblems["4.03c"] = true;
    gradedProblems["4.04a"] = true;
    gradedProblems["4.04b"] = true;
    gradedProblems["4.03a"] = true;
    gradedProblems["4.03b"] = true;
    gradedProblems["4.08a"] = true;
    gradedProblems["4.08b"] = true;
    gradedProblems["4.18a"] = true;
    gradedProblems["4.18b"] = true;
    gradedProblems["4.11a"] = true;
    gradedProblems["4.11b"] = true;
    gradedProblems["4.10a"] = true;
    gradedProblems["4.10b"] = true;
    gradedProblems["4.13"]  = true;

    return gradedProblems;
}
