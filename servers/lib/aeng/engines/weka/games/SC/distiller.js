/**
 * Assessment SimCity Distiller Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  redis      - https://github.com/mranney/node_redis
 *  couchnode  - https://github.com/couchbase/couchnode
 *
 */
// Third-party libs
var _       = require('lodash');
var when    = require('when');
var redis   = require('redis');
// Glasslab libs
var tConst;

module.exports = SC_Distiller;

function SC_Distiller(){
    // Glasslab libs
}


var cTypeConst = {
    TYPE_COMPLEX_PROBLEM_SOLVING: "cps",
    TYPE_COMPLEX_PROBLEM_SOLVING_MAPS: "cpssm",
    TYPE_COMPLEX_PROBLEM_SOLVING_M3: "cps_m3",
    TYPE_COMPLEX_PROBLEM_SOLVING_M5: "cps_m5",
    TYPE_INTEGRATING_INFO_FROM_TEXT_DIAGRAMS: "iiftd",
    TYPE_INTEGRATING_INFO_FROM_TEXT_DIAGRAMS_M3: "iiftd_m3",
    TYPE_INTEGRATING_INFO_FROM_TEXT_DIAGRAMS_M5: "iiftd_m5",
    TYPE_LOCATING_EVIDENCE_WITHIN_TEXT: "lewt",
    TYPE_LOCATING_EVIDENCE_WITHIN_TEXT_M3: "lewt_m3",
    TYPE_LOCATING_EVIDENCE_WITHIN_TEXT_M5: "lewt_m5",
    TYPE_COMPLEX_PROBLEM_SOLVING_SYSTEMS_MAP: "cpssm"
};

var activityIdToCompetencyMap = {
    "MedusaA1Power01": {
        "competency": "Complex Problem Solving -Games",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING
    },
    "MedusaA1Pollution01": {
        "competency": "Complex Problem Solving -Games",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING
    },
    "063cf110-e0f6-11e2-a9b1-fbf5ea959a8c": {
        "competency": "Complex Problem Solving -Systems Map",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_SYSTEMS_MAP
    },
    "723dfa90-e0f5-11e2-a9b1-fbf5ea959a8c": {
        "competency": "Complex Problem Solving -Systems Map",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_SYSTEMS_MAP
    },
    "b71d8d00-e0f6-11e2-a9b1-fbf5ea959a8c": {
        "competency": "Complex Problem Solving -Systems Map",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_SYSTEMS_MAP
    },
    "249ed870-e0f7-11e2-a9b1-fbf5ea959a8c": {
        "competency": "Complex Problem Solving -Systems Map",
        "competencyCode": cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_SYSTEMS_MAP
    },
    "2bfb6dc0-e40a-11e2-9336-d1ab0cf51c41": {
        "competency": "Integrating Info From Text and Diagrams",
        "competencyCode": cTypeConst.TYPE_INTEGRATING_INFO_FROM_TEXT_DIAGRAMS
    },
    "12252b50-e01f-11e2-a7e8-3f4343712aaf": {
        "competency": "Locating Evidence Within Text",
        "competencyCode": cTypeConst.TYPE_LOCATING_EVIDENCE_WITHIN_TEXT
    }
};

SC_Distiller.prototype.preProcess = function(sessionsEvents){
    // only use the last (only) session
    var events = sessionsEvents[0];
    //console.log("events:", events);

    //--- Setup initial member variables ---//
    // Scenario type info
    var isScenarioSet = false;
    var scenarioName = "";
    var wekaFile = "";

    // Score info
    var starRating = 0;
    var ratingText = "";
    var teacherFeedbackCode = "";
    var cType = "";

    // Thermometer summary info
    var jobsEndState = 0;
    var jobsTarget = 2600;
    var pollutionEndState = 0;
    var pollutionTargetMin = 10000000;
    var pollutionTargetMax = 45000000;

    // Heartbeat info
    var powerProducedEndState = 0;
    var powerConsumedEndState = 0;
    var powerCoalProduced = 0;
    var powerWindProduced = 0;
    var powerSolarProduced = 0;

    // Sequence events to identify over the course of the stream
    var powerSequenceEvents = [ "GL_Unit_Plop", "GL_Unit_Bulldoze", "GL_Action_Building" ];
    var rciSequenceEvents = [ "GL_Zone", "GL_Dezone", "GL_Unit_Bulldoze" ];

    // Green power plant guids, coal power plant guids, and power plant names
    var powerPlantGuidsGreen = [ "0x808c9e36", "0xa230f2dc", "0x0114acae", "0x8afeb8ad", "0x75f99bf9", "0x14882b3c", "0x94dde372" ];
    var powerPlantGuidsCoal = [ "0x0f03c3ca", "0xbfe4d762" ];
    var powerPlantNamesCoal = [ "Coal Power Plant", "Dirty Coal Generator" ];

    // Define variables used to identify power sequences
    var powerECSequenceStarted = false;
    var powerECSequenceTimerZero = 0;
    var powerEDSequenceStarted = false;
    var powerEDSequenceTimerZero = 0;
    // Keep track of evidence elements for power sequences
    var powerElementAIdentified = 0;        // number of coal removal actions
    var powerElementBIdentified = 0;        // number of green placement actions
    var powerElementCIdentified = false;    // coal removal -> green placement sequence
    var powerElementDIdentified = false;    // green placement -> coal removal sequence

    // Define variables used to identify the power performance component
    var powerExchanged = 0;
    var powerDeviation = 6616;
    var powerPerformanceComponent = -1;

    // Define variables used to identify power sequences
    var rciECSequenceStarted = false;
    var rciECSequenceTimerZero = 0;
    var rciEDSequenceStarted = false;
    var rciEDSequenceTimerZero = 0;
    // Keep track of evidence elements for RCI sequences
    var rciElementAIdentified = 0;          // number of dezoning actions
    var rciElementBIdentified = 0;          // number of zoning actions
    var rciElementCIdentified = 0;          // bulldoze industry -> dezone industry sequences
    var rciElementDIdentified = 0;          // dezone industry -> bulldoze industry sequences
    var rciElementEIdentified = 0;          // number of commercial zones created

    // Define variables used to identify the performance categories
    var endStateCategory = 0;
    var powerRRCategory = 0;
    var rciRRCategory = 0;
    var combinedRRCategory = 0;


    // Get distiller function from Couchbase
    //

    // Process data through distiller function
    var eventsList = events.events;
    for( var i = 0; i < eventsList.length; i++ ) {
        // Get the event name
        var eventName = eventsList[i].name;//.getElementById( "name" );
        //console.log("i:", i, ", eventName:", eventName);

        //--- Identify the event ---//
        // A scenario accepted event identifies which scenario is being played
        // Right now, we only check for Sierra Madre or Jackson City
        if( eventName == "GL_Scenario_Loaded" ) {
            // Get the scenario name in the event data
            scenarioName = eventsList[i].eventData.name;

            // Check which scenario was played and set variables
            if( scenarioName == "Medusa A4 - PowerPollution.txt" ) {
                isScenarioSet = true;
                scenarioName = "SIERRA_MADRE";
                wekaFile = "sierra_madre";
                cType = cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_M3;
            }
            else if( scenarioName == "Medusa A3 - Large City.txt" ) {
                isScenarioSet = true;
                scenarioName = "JACKSON_CITY";
                wekaFile = "jackson_city";
                cType = cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_M5;
            }
        }
        // A score event informs the star rating, rating text, and teacher feedback code
        else if( eventName == "GL_Scenario_Score" ) {
            // Get the score data
            var scoreData = eventsList[i].eventData;

            // Set the score data
            starRating = scoreData.stars;
            ratingText = scoreData.text;
            teacherFeedbackCode = scoreData.teacherFeedback;
        }
        // Only continue with the remaining events if the scenario variable was set properly
        else if( isScenarioSet ) {
            // A summary event describes the jobs and pollution score (JACKSON CITY ONLY)
            // or pollution and power (SIERRA MADRE ONLY)
            if( eventName == "GL_Scenario_Summary" ) {
                // Get the summary data
                var summaryData = eventsList[i].eventData;

                // Set thermometer scores for SIERRA_MADRE
                if( scenarioName == "SIERRA_MADRE" ) {
                    pollutionEndState = parseInt( summaryData.pollutionScore );
                    pollutionTargetMin = 10000000;
                    pollutionTargetMax = 20000000;
                }
                // Set thermometer scores for JACKSON_CITY
                else if( scenarioName == "JACKSON_CITY" ) {
                    jobsEndState = summaryData.jobsScore.replace( /,/g , "" );
                    pollutionEndState = parseInt( summaryData.pollutionScore );
                }
            }
            // Data heartbeats are captured at certain intervals (ex. 30 seconds)
            // These help describe state change over time
            else if( eventName == "GL_Challenge_Secondary_Heartbeat" ) {
                // Get the heartbeat data
                var heartbeatData = eventsList[i].eventData;

                // Set the heartbeat data
                powerProducedEndState = parseInt( heartbeatData.PowerTransmitted );
                powerConsumedEndState = parseInt( heartbeatData.PowerConsumed );
                powerCoalProduced = parseInt( heartbeatData.CoalPower );
                powerWindProduced = parseInt( heartbeatData.WindPower );
                powerSolarProduced = parseInt( heartbeatData.SolarPower );
            }

            //--- Identify sequences with remaining event types ---//
            // Look for sequences with power events
            if( powerSequenceEvents &&
                powerSequenceEvents.indexOf( eventName ) > -1 ) {
                // Store catalyst states so we know when certain events occur
                var eCCatalystIdentified = false;
                var eDCatalystIdentified = false;

                // Get the data for the event
                var eventData = eventsList[i].eventData;

                //--- Update the local sequences ---//
                // Check for any building plops
                if( eventName == "GL_Unit_Plop" ) {
                    // Get the building guid
                    var guid = eventData.UGuid;

                    // Check for green power plants in this plop
                    if( powerPlantGuidsGreen &&
                        powerPlantGuidsGreen.indexOf( guid ) > -1 ) {
                        // Catalyst identified
                        eDCatalystIdentified = true;

                        // Update Element B
                        powerElementBIdentified++;
                    }
                }
                // Check for building bulldozes
                else if( eventName == "GL_Unit_Bulldoze" ) {
                    // Get the building guid
                    var guid = eventData.UGuid;

                    // Check for green power plants in this plop
                    if( powerPlantGuidsCoal &&
                        powerPlantGuidsCoal.indexOf( guid ) > -1 ) {
                        // Catalyst identified
                        eCCatalystIdentified = true;

                        // Update Element A
                        powerElementAIdentified++;
                    }
                }
                // Check for generic actions on buildings
                else if( eventName == "GL_Action_Building" ) {
                    // Get the building name and action
                    var buildingName = eventData.name;
                    var buildingAction = eventData.action;

                    // Only check for the "turnedOff" action for the appropriate buildings
                    if( buildingAction == "turnedOff" &&
                        powerPlantNamesCoal &&
                        powerPlantNamesCoal.indexOf( buildingName ) > -1 ) {
                        // Catalyst identified
                        eCCatalystIdentified = true;

                        // Update Element A
                        powerElementAIdentified++;
                    }

                    //console.log("i:", i, ", eventName:", eventName, ", buildingName:", buildingName, ", buildingAction:", buildingAction, ", eCCatalystIdentified:", eCCatalystIdentified, ", powerElementAIdentified:", powerElementAIdentified);
                }

                // Proceed with identifying sequences from the elements captured in the above code
                if( powerElementCIdentified && powerElementDIdentified ) {
                    // Do nothing
                }
                else {
                    // Check for the catalyst, "coal removal"
                    if( eCCatalystIdentified ) {
                        // Get the scenario time
                        var scenarioTimeAsString = eventData.scenarioTime;
                        var scenarioTimeInSeconds = convertFormattedTimeToSeconds( scenarioTimeAsString );

                        // The Element C catalyst will always restart the sequence timer
                        powerECSequenceStarted = true;
                        powerECSequenceTimerZero = scenarioTimeInSeconds;

                        // This catalyst is also the closing event for Element D
                        if( powerEDSequenceStarted ) {
                            if( powerECSequenceTimerZero - powerEDSequenceTimerZero < 60 ) {
                                powerElementDIdentified = true;
                            }
                        }
                    }
                    // Check for the catalyst, "green placed"
                    if( eDCatalystIdentified ) {
                        // Get the scenario time
                        var scenarioTimeAsString = eventData.scenarioTime;
                        var scenarioTimeInSeconds = convertFormattedTimeToSeconds( scenarioTimeAsString );

                        // The Element D catalyst will always restart the sequence timer
                        powerEDSequenceStarted = true;
                        powerEDSequenceTimerZero = scenarioTimeInSeconds;

                        // This catalyst is also the closing event for Element C
                        if( powerECSequenceStarted ) {
                            if( powerEDSequenceTimerZero - powerECSequenceTimerZero < 60 ) {
                                powerElementCIdentified = true;
                            }
                        }
                    }
                }
            }
            // Look for sequences with RCI events
            if( rciSequenceEvents &&
                rciSequenceEvents.indexOf( eventName ) > -1 ) {
                // Store catalyst states so we know when certain events occur
                var eCCatalystIdentified = false;
                var eDCatalystIdentified = false;

                // Get the data for the event
                var eventData = eventsList[i].eventData;

                //--- Update the local sequences ---//
                // Check for zoning operations
                if( eventName == "GL_Zone" ) {
                    // Get the type
                    var type = eventData.type.substring( 0, 3 );

                    // Update Element B for any zone type
                    rciElementBIdentified++;

                    // Check for commercial zones
                    if( type.toLowerCase() == "com" ) {
                        // Update Element E
                        powerElementEIdentified++;
                    }
                }
                // Check for dezoning operations
                else if( eventName == "GL_Dezone" ) {
                    // Get the type
                    var type = eventData.type.substring( 0, 3 );

                    // Update Element A for any zone type
                    rciElementAIdentified++;

                    // Check for industrial zones
                    if( type.toLowerCase() == "ind" ) {
                        // Catalyst identified
                        eDCatalystIdentified = true;
                    }
                }
                // Check for building bulldozes
                else if( eventName == "GL_Unit_Bulldoze" ) {
                    // Get the building name
                    var buildingName = eventData.name;
                    if( buildingName.length >= 3 ) {
                        buildingName = buildingName.substring( 0, 3 );
                    }

                    // Check for industrial building bulldozes
                    if( buildingName == "ind" ) {
                        // Catalyst identified
                        eCCatalystIdentified = true;
                    }
                }

                // Proceed with identifying sequences from the elements captured in the above code
                // Check for the catalyst, "bulldoze industry"
                if( eCCatalystIdentified ) {
                    // Get the scenario time
                    var scenarioTimeAsString = eventData.scenarioTime;
                    var scenarioTimeInSeconds = convertFormattedTimeToSeconds( scenarioTimeAsString );

                    // The Element C catalyst will always restart the sequence timer
                    rciECSequenceStarted = true;
                    rciECSequenceTimerZero = scenarioTimeInSeconds;

                    // This catalyst is also the closing event for Element D
                    if( rciEDSequenceStarted ) {
                        if( rciECSequenceTimerZero - rciEDSequenceTimerZero < 60 ) {
                            rciElementDIdentified++;
                            rciEDSequenceStarted = false;
                        }
                    }
                }
                // Check for the catalyst, "dezone industry"
                if( eDCatalystIdentified ) {
                    // Get the scenario time
                    var scenarioTimeAsString = eventData.scenarioTime;
                    var scenarioTimeInSeconds = convertFormattedTimeToSeconds( scenarioTimeAsString );

                    // The Element D catalyst will always restart the sequence timer
                    rciEDSequenceStarted = true;
                    rciEDSequenceTimerZero = scenarioTimeInSeconds;

                    // This catalyst is also the closing event for Element C
                    if( rciECSequenceStarted ) {
                        if( rciEDSequenceTimerZero - rciECSequenceTimerZero < 60 ) {
                            rciElementCIdentified++;
                            rciECSequenceStarted = false;
                        }
                    }
                }
            }
        }
    }

    // Only perform the remaining assessment for Sierra Madre and Jackson City
    if( isScenarioSet ) {
        // Get the power performance component
        if( starRating == 0 ) {
            powerPerformanceComponent = 0;
        }
        else if( powerProducedEndState < ( powerConsumedEndState - powerDeviation ) ) {
            powerPerformanceComponent = 0;
        }
        else if( powerProducedEndState > ( powerConsumedEndState + powerDeviation ) ) {
            powerPerformanceComponent = 1;
        }
        else if( ( powerProducedEndState - powerConsumedEndState ) < ( powerDeviation * 2 ) ) {
            powerPerformanceComponent = 2;
        }
        // Get the total power exchanged
        powerExchanged = ( powerWindProduced + powerSolarProduced ) - powerCoalProduced;


        /*
         * At this point, we have:
         *  - jobsEndState
         *  - pollutionEndState
         *  - power elements A-D identified
         *  - rci elements A-E identified
         *
         *  From here, we can get the E and R categories and get the liklihood estimates
         */

        // Determine the end state category and RCI remove-replace for Sierra Madre
        if( scenarioName == "SIERRA_MADRE" ) {
            // Determine the pollution performance component
            var pollutionPerformanceComponent = 0;
            if( pollutionEndState <= pollutionTargetMin ) {
                pollutionPerformanceComponent = 2;
            }
            else if( pollutionEndState <= pollutionTargetMax ) {
                pollutionPerformanceComponent = 1;
            }
            else {
                pollutionPerformanceComponent = 0;
            }

            // Take the pollution performance component, power performance component, and power exchange value
            // to determine the end state category
            if( pollutionPerformanceComponent == 0 ) {
                endStateCategory = 0;
            }
            else if( pollutionPerformanceComponent == 2 && powerPerformanceComponent == 0 ) {
                endStateCategory = 1;
            }
            else if( pollutionPerformanceComponent == 1 && powerPerformanceComponent < 2 ) {
                endStateCategory = 2;
            }
            else if( pollutionPerformanceComponent == 1 && powerPerformanceComponent == 2 ) {
                endStateCategory = 3;
            }
            else if( pollutionPerformanceComponent == 2 && powerPerformanceComponent == 1 ) {
                endStateCategory = 4;
            }
            else if( pollutionPerformanceComponent == 2 && powerPerformanceComponent == 2 && powerExchanged >= 0 ) {
                endStateCategory = 4;
            }
            else if( pollutionPerformanceComponent == 2 && powerPerformanceComponent == 2 && powerExchanged < 0 ) {
                endStateCategory = 5;
            }

            // Find the RCI remove-replace category
            if( rciElementAIdentified > 0 || rciElementBIdentified > 0 ) {
                rciRRCategory = ( rciElementCIdentified + rciElementDIdentified ) / ( rciElementAIdentified + rciElementBIdentified );
            }
            else {
                rciRRCategory = 0;
            }
        }
        // Determine the end state category and RCI remove-replace for Jackson City
        else if( scenarioName == "JACKSON_CITY" ) {
            // Determine the end state category from the jobs and pollution end states
            if( jobsEndState >= jobsTarget ) {
                if( pollutionEndState <= pollutionTargetMin ) {
                    endStateCategory = 4;
                }
                else if( pollutionEndState <= pollutionTargetMax ) {
                    endStateCategory = 3;
                }
                else {
                    endStateCategory = 2;
                }
            }
            else {
                if( pollutionEndState <= pollutionTargetMin ) {
                    endStateCategory = 2;
                }
                else if( pollutionEndState <= pollutionTargetMax ) {
                    endStateCategory = 1;
                }
                else {
                    endStateCategory = 0;
                }
            }

            // Find the RCI remove-replace category
            if( rciElementAIdentified > 0 || rciElementBIdentified > 0 ) {
                rciRRCategory = ( rciElementCIdentified + rciElementDIdentified + rciElementEIdentified ) / ( rciElementAIdentified + rciElementBIdentified );
            }
            else {
                rciRRCategory = 0;
            }
        }

        // Determine the power remove replace category
        if( powerElementAIdentified == 0 && powerElementBIdentified == 0 && !powerElementCIdentified && !powerElementDIdentified ) {
            powerRRCategory = 0;
        }
        else if( powerElementAIdentified > 0 && powerElementBIdentified == 0 && !powerElementCIdentified && !powerElementDIdentified ) {
            powerRRCategory = 1;
        }
        else if( powerElementAIdentified == 0 && powerElementBIdentified > 0 && !powerElementCIdentified && !powerElementDIdentified ) {
            powerRRCategory = 2;
        }
        else if( powerElementAIdentified > 0 && powerElementBIdentified > 0 && !powerElementCIdentified && !powerElementDIdentified ) {
            powerRRCategory = 3;
        }
        else if( powerElementAIdentified > 0 && powerElementBIdentified > 0 && powerElementCIdentified && !powerElementDIdentified ) {
            powerRRCategory = 4;
        }
        else {
            powerRRCategory = 5;
        }

        // Find the combined remove-replace category by comapring power and RCI remove-replace categories
        if( powerRRCategory == 0 && rciRRCategory == 0 ) {
            combinedRRCategory = 0;
        }
        else if( ( powerRRCategory == 0 && rciRRCategory > 0 ) || ( powerRRCategory == 1 && rciRRCategory == 0 ) || ( powerRRCategory == 2 && rciRRCategory == 0 ) ) {
            combinedRRCategory = 1;
        }
        else if( ( powerRRCategory == 1 && rciRRCategory > 0 ) || ( powerRRCategory == 2 && rciRRCategory > 0 ) ) {
            combinedRRCategory = 2;
        }
        else if( ( powerRRCategory == 3 && rciRRCategory == 0 ) || ( powerRRCategory == 4 && rciRRCategory == 0 ) || ( powerRRCategory == 5 && rciRRCategory == 0 ) ) {
            combinedRRCategory = 3;
        }
        else if( ( powerRRCategory == 3 && rciRRCategory > 0 ) || ( powerRRCategory == 4 && rciRRCategory > 0 ) ) {
            combinedRRCategory = 4;
        }
        else if( powerRRCategory == 5 && rciRRCategory > 0 ) {
            combinedRRCategory = 5;
        }
    }

    /*
     * As a result, I have two pieces of evidence to send to the Bayes' Net:
     *  - End State Category (endStateCategory)
     *  - Combined Remove-Replace Category (combinedRRCategory)
     *
     * This information needs to be stored in Couchbase: glasslab_assessment
     */

    /*
    var bayesInfo = {
        bayesFile: wekaFile,
        evidenceFragments: [
            endStateCategory,
            combinedRRCategory
        ]
    };
    */

    var distillInfo = {
        competencyType : cType,
        teacherFeedbackCode: teacherFeedbackCode,
        note : ratingText,
        bayes: {
            key: wekaFile,
            root: "category_sys_mod",
            fragments: {
                "category_end_state": endStateCategory,
                "category_remove_replace": combinedRRCategory
            }
        }
    };

    // return distilled data for Sierra Madre and Jackson City
    return distillInfo;
};

SC_Distiller.prototype.postProcess = function(distilled, wekaResults) {
    var compData = {};
    //console.log("postProcess distilled:", distilled);
    //console.log("postProcess wekaResults:", wekaResults);

    // Get the competency level
    var competencyLevel = 0;
    var maxValue = 0;
    for( var i = 0; i < wekaResults.length; i++ ) {
        if(wekaResults[i] > maxValue) {
            maxValue = wekaResults[i];
            competencyLevel = i + 1;
        }
    }

    // competency type
    compData.competencyType = distilled.competencyType;
    compData.level = competencyLevel;
    compData.teacherFeedbackCode = distilled.teacherFeedbackCode;
    compData.studentFeedbackCode = distilled.teacherFeedbackCode;
    compData.data = { competencyLevel : competencyLevel, competencyType : distilled.competencyType };
    compData.note = distilled.note;

    var info =_.cloneDeep(distilled);
    info.bayes.wekaResults = wekaResults;
    compData.info = JSON.stringify(info);

    compData.timeSpentSec = 0;
    compData.numAttempts = 1;

    return compData;
};

function convertFormattedTimeToSeconds( timeAsString ) {
    if( !timeAsString ||
        !_.isString(timeAsString) ) {
      return 0;
    }

    var indexOfSeparator = timeAsString.indexOf( ":" );
    var scenarioTimeMinutes = parseInt( timeAsString.substring( 0, indexOfSeparator ) );
    var scenarioTimeSeconds = parseInt( timeAsString.substring( indexOfSeparator + 1 ) );
    return ( ( scenarioTimeMinutes * 60 ) + scenarioTimeSeconds );
}