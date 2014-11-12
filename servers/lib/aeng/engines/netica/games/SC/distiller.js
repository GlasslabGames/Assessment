/**
 * Assessment SimCityEDU Distiller Module
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

module.exports = SC_Distiller;

function SC_Distiller(){
    // Glasslab libs
}


var cTypeConst = {
    TYPE_COMPLEX_PROBLEM_SOLVING: "cps",
    TYPE_COMPLEX_PROBLEM_SOLVING_MAPS: "cpssm",
    TYPE_COMPLEX_PROBLEM_SOLVING_M2: "cps_m2",
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

SC_Distiller.prototype.preProcess = function(sessionsEvents) {
    // only use the last (only) session
    var events = sessionsEvents[0];

    // Green power plant guids, coal power plant guids, and power plant names
    var greenPowerGuids = [ "0x808c9e36", "0xa230f2dc", "0x0114acae", "0x8afeb8ad", "0x75f99bf9", "0x14882b3c", "0x94dde372", "0x7134a6c6", "0x167f3ad5" ];
    var dirtyPowerGuids = [ "0x0f03c3ca", "0xbfe4d762" ];
    var greenPowerNames = [ "Wind Power Plant", "Solar Power Plant", "Large Wind Plant" ];
    var dirtyPowerNames = [ "Coal Power Plant", "Dirty Coal Generator" ];

    // Store the basic scenario info
    var isScenarioSet = false;
    var scenarioInfo = {};
    var scoreInfo = {};
    var endStateInfo = {};
    var finalScenarioTime = 0;          // in seconds
    var startScenarioTime = -1;
    var endScenarioTime = -1;
    var finalScenarioTimeSet = false;   // make sure this only happens once

    // Zoning info
    var zoningInfo = {
        zoneRes: 0,
        zoneCom: 0,
        zoneInd: 0,
        dezoneRes: 0,
        dezoneCom: 0,
        dezoneInd: 0
    };

    // Plop info
    var plopInfo = {
        dirtyPower: 0,
        greenPower: 0
    };

    // Bulldoze info
    var bulldozeInfo = {
        dirtyPower: 0,
        greenPower: 0
    };

    // Building action info
    var buildingActonInfo = {
        dirtyOn: 0,
        dirtyOff: 0,
        greenOn: 0,
        greenOff: 0
    };

    // Power failure state
    var powerFailure = false;


    // Process data through distiller function
    var eventsList = events.events;
    for( var i = 0; i < eventsList.length; i++ ) {
        // Get the event name
        var eventName = eventsList[i].name;

        // Get the data for the event
        var eventData = eventsList[i].eventData;

        //--- Identify the event ---//
        // A scenario accepted event identifies which scenario is being played
        // Right now, we only check for Worker Shortage, Sierra Madre, and Jackson City
        if( eventName == "GL_Scenario_Loaded" ) {
            // Get the scenario name in the event data
            scenarioInfo.scenarioName = eventsList[i].eventData.name;

            // Get the start time
            startScenarioTime = parseInt( eventsList[i].timestamp );
            if( !finalScenarioTimeSet && endScenarioTime != -1 ) {
                finalScenarioTime = ( endScenarioTime - startScenarioTime ) / 1000;
                finalScenarioTimeSet = true;
            }

            // Check which scenario was played and set the info
            if( scenarioInfo.scenarioName == "Medusa A2 - Worker Shortage.txt" ) {
                isScenarioSet = true;
                scenarioInfo.scenarioName = "WORKER_SHORTAGE";
                scenarioInfo.bayesFile = "worker_shortage";
                scenarioInfo.cType = cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_M2;
            }
            else if( scenarioInfo.scenarioName == "Medusa A4 - PowerPollution.txt" ) {
                isScenarioSet = true;
                scenarioInfo.scenarioName = "SIERRA_MADRE";
                scenarioInfo.bayesFile = "sierra_madre";
                scenarioInfo.cType = cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_M3;
            }
            else if( scenarioInfo.scenarioName == "Medusa A3 - Large City.txt" ) {
                isScenarioSet = true;
                scenarioInfo.scenarioName = "JACKSON_CITY";
                scenarioInfo.bayesFile = "jackson_city";
                scenarioInfo.cType = cTypeConst.TYPE_COMPLEX_PROBLEM_SOLVING_M5;
            }
        }
        // A score event informs the star rating, rating text, and teacher feedback code
        else if( eventName == "GL_Scenario_Score" ) {
            // Get the score data
            var scoreData = eventsList[i].eventData;

            // Set the score data
            scoreInfo.starRating = scoreData.stars;
            scoreInfo.ratingText = scoreData.text;
            scoreInfo.teacherFeedbackCode = scoreData.teacherFeedback;
        }
        // Only continue with the remaining events if the scenario variable was set properly
        else if( isScenarioSet ) {
            // A summary event describes the final mission metrics
            if( eventName == "GL_Scenario_Summary" ) {
                // Get the summary data
                var summaryData = eventsList[i].eventData;

                // Get the end time
                endScenarioTime = parseInt( eventsList[i].timestamp );
                if( !finalScenarioTimeSet && startScenarioTime != -1 ) {
                    finalScenarioTime = ( endScenarioTime - startScenarioTime ) / 1000;
                    finalScenarioTimeSet = true;
                }

                // Set thermometer scores for WORKER_SHORTAGE
                if( scenarioInfo.scenarioName == "WORKER_SHORTAGE" ) {
                    endStateInfo.jobs = parseInt( summaryData.jobsScore );
                }
                // Set thermometer scores for SIERRA_MADRE
                else if( scenarioInfo.scenarioName == "SIERRA_MADRE" ) {
                    endStateInfo.pollution = parseInt( summaryData.pollutionScore );
                }
                // Set thermometer scores for JACKSON_CITY
                else if( scenarioInfo.scenarioName == "JACKSON_CITY" ) {
                    endStateInfo.jobs = summaryData.jobsScore.replace( /,/g , "" );
                    endStateInfo.pollution = parseInt( summaryData.pollutionScore );
                }
            }
            // Check for any building plops
            else if( eventName == "GL_Unit_Plop" ) {
                // Get the building guid
                var guid = eventData.UGuid;

                // Check for green power plants in this plop
                if( greenPowerGuids &&
                    greenPowerGuids.indexOf( guid ) > -1 ) {
                    plopInfo.greenPower++;
                }
                // Check for dirty power plants in this plop
                else if( dirtyPowerGuids &&
                    dirtyPowerGuids.indexOf( guid ) > -1 ) {
                    plopInfo.dirtyPower++;
                }
            }
            // Check for building bulldozes
            else if( eventName == "GL_Unit_Bulldoze" ) {
                // Get the building guid and name
                var guid = eventData.UGuid;
                var name = eventData.name;

                // Check for green power plants in this plop
                if( greenPowerGuids &&
                    greenPowerGuids.indexOf( guid ) > -1 ) {
                    bulldozeInfo.greenPower++;
                }
                // Check for dirty power plants in this plop
                else if( dirtyPowerGuids &&
                    dirtyPowerGuids.indexOf( guid ) > -1 ) {
                    bulldozeInfo.dirtyPower++;
                }
            }
            // Check for generic actions on buildings
            else if( eventName == "GL_Action_Building" ) {
                // Get the building name and action
                var buildingName = eventData.name;
                var buildingAction = eventData.action;

                // Check for the "turnedOff" action
                if( buildingAction == "turnedOff" ) {
                    // Check green
                    if( greenPowerNames &&
                        greenPowerNames.indexOf( buildingName ) > -1 ) {
                        buildingActonInfo.greenOff++;
                    }
                    // Check dirty
                    else if( dirtyPowerNames &&
                        dirtyPowerNames.indexOf( buildingName ) > -1 ) {
                        buildingActonInfo.dirtyOff++;
                    }
                }
                // Check for the "turnedOn" action
                else if( buildingAction == "turnedOn" ) {
                    // Check green
                    if( greenPowerNames &&
                        greenPowerNames.indexOf( buildingName ) > -1 ) {
                        buildingActonInfo.greenOn++;
                    }
                    // Check dirty
                    else if( dirtyPowerNames &&
                        dirtyPowerNames.indexOf( buildingName ) > -1 ) {
                        buildingActonInfo.dirtyOn++;
                    }
                }
            }
            // Check for zoning operations
            else if( eventName == "GL_Zone" ) {
                // Get the type
                var type = eventData.type.substring( 0, 3 );

                // Check for residential zones
                if( type.toLowerCase() == "res" ) {
                    zoningInfo.zoneRes++;
                }
                // Check for commercial zones
                else if( type.toLowerCase() == "com" ) {
                    zoningInfo.zoneCom++;
                }
                // Check for industrial zones
                else if( type.toLowerCase() == "ind" ) {
                    zoningInfo.zoneInd++;
                }
            }
            // Check for dezoning operations
            else if( eventName == "GL_Dezone" ) {
                // Get the type
                var type = eventData.type.substring( 0, 3 );

                // Check for residential zones
                if( type.toLowerCase() == "res" ) {
                    zoningInfo.dezoneRes++;
                }
                // Check for commercial zones
                else if( type.toLowerCase() == "com" ) {
                    zoningInfo.dezoneCom++;
                }
                // Check for industrial zones
                else if( type.toLowerCase() == "ind" ) {
                    zoningInfo.dezoneInd++;
                }
            }
            // Check for a power failure
            else if( eventName == "GL_Failure" ) {
                if( eventData.info == "Power Failure" ) {
                    powerFailure = true;
                }
            }
        }
    }

    //--- Complete the scoring ---//
    var endStateValue = 0;
    var processValue = 0;

    // WORKER_SHORTAGE
    if( scenarioInfo.scenarioName == "WORKER_SHORTAGE" ) {
        var zoneDezoneComInd = ( zoningInfo.zoneCom + zoningInfo.zoneInd ) - (zoningInfo.dezoneCom + zoningInfo.dezoneInd );
        var zoneDezoneUpper = ( zoneDezoneComInd < 42 ) ? 0 : 1;
        var zoneDezoneRes = zoningInfo.dezoneRes - zoningInfo.zoneRes;
        var zoneDezoneLower = ( zoneDezoneRes >= 0 ) ? 0 : 1;

        // Get the process value
        if( zoneDezoneUpper == 1 && ( zoningInfo.zoneCom > 0 || zoningInfo.zoneInd > 0 ) ) {
            processValue = 2;
        }
        else if( zoneDezoneLower == 1 && ( zoningInfo.zoneCom > 0 || zoningInfo.zoneInd > 0 ) ) {
            processValue = 1;
        }
        else {
            processValue = 0;
        }

        // Get the end state value
        if( endStateInfo.jobs < 900 ) {
            endStateValue = 0;
        }
        else {
            endStateValue = 1;
        }
    }
    // SIERRA_MADRE
    else if( scenarioInfo.scenarioName == "SIERRA_MADRE" ) {
        var netCoalRemoval = ( bulldozeInfo.dirtyPower - plopInfo.dirtyPower ) + ( buildingActonInfo.dirtyOff - buildingActonInfo.dirtyOn );
        var netAltEnergyPlacement = ( plopInfo.greenPower - bulldozeInfo.greenPower ) + ( buildingActonInfo.greenOn - buildingActonInfo.greenOff );
        var errIndex = netAltEnergyPlacement - netCoalRemoval;

        // Set the process state
        if( errIndex >= -1 && netCoalRemoval >= 4 ) {
            processValue = 5;
        }
        else if( errIndex < -1 ) {
            processValue = 4;
        }
        else if( errIndex >= -1 && netCoalRemoval < 4 ) {
            processValue = 3;
        }
        else if( netCoalRemoval > 0 && netAltEnergyPlacement == 0 ) {
            processValue = 2;
        }
        else if( netCoalRemoval == 0 && netAltEnergyPlacement > 0 ) {
            processValue = 1;
        }
        else {
            processValue = 0;
        }

        var pollutionCluster = 0;
        if( endStateInfo.pollution < 20000000 ) {
            pollutionCluster = 2;
        }
        else if( endStateInfo.pollution < 40000000 ) {
            pollutionCluster = 1;
        }

        // Get the end state value
        if( pollutionCluster == 2 && !powerFailure ) {
            endStateValue = 4;
        }
        else if( pollutionCluster == 1 && !powerFailure ) {
            endStateValue = 3;
        }
        else if( pollutionCluster == 2 && powerFailure ) {
            endStateValue = 2;
        }
        else if( pollutionCluster == 1 && powerFailure ) {
            endStateValue = 1;
        }
        else {
            endStateValue = 0;
        }
    }
    // JACKSON_CITY
    else if( scenarioInfo.scenarioName == "JACKSON_CITY" ) {
        var netCoalRemoval = ( bulldozeInfo.dirtyPower - plopInfo.dirtyPower ) + ( buildingActonInfo.dirtyOff - buildingActonInfo.dirtyOn );
        var netAltEnergyPlacement = ( plopInfo.greenPower - bulldozeInfo.greenPower ) + ( buildingActonInfo.greenOn - buildingActonInfo.greenOff );
        var errIndex = netAltEnergyPlacement - netCoalRemoval;

        // Set the process state
        if( errIndex >= -4 && netCoalRemoval >= 9 ) {
            processValue = 5;
        }
        else if( errIndex < -4 ) {
            processValue = 4;
        }
        else if( errIndex >= -4 && netCoalRemoval < 9 ) {
            processValue = 3;
        }
        else if( netCoalRemoval > 0 && netAltEnergyPlacement == 0 ) {
            processValue = 2;
        }
        else if( netCoalRemoval == 0 && netAltEnergyPlacement > 0 ) {
            processValue = 1;
        }
        else {
            processValue = 0;
        }

        // Get the end state value
        if( endStateInfo.jobs >= 2200 && endStateInfo.pollution < 19000000 ) {
            endStateValue = 5;
        }
        else if( endStateInfo.jobs >= 2200 && endStateInfo.pollution < 51000000 ) {
            endStateValue = 4;
        }
        else if( endStateInfo.jobs < 2200 && endStateInfo.pollution < 19000000 ) {
            endStateValue = 3;
        }
        else if( endStateInfo.jobs >= 2200 && endStateInfo.pollution >= 51000000 ) {
            endStateValue = 2;
        }
        else if( endStateInfo.jobs < 2200 && endStateInfo.pollution < 51000000 ) {
            endStateValue = 1;
        }
        else {
            endStateValue = 0;
        }
    }

    // Finally, make sure the time played is greather than 60 seconds, otherwise reset the fragments
    if( !finalScenarioTimeSet || finalScenarioTime < 60 ) {
        processValue = 0;
        endStateValue = 0;
    }

    /*
     * As a result, I have two pieces of evidence to send to the Bayes' Net:
     *  - End State Category (endStateCategory)
     *  - Process Category (processCategory, formally combinedRRCategory)
     *
     * This information needs to be stored in Couchbase: glasslab_assessment
     */

    /*
        var bayesInfo = {
            bayesFile: bayesFile,
            evidenceFragments: [
                endStateCategory,
                processCategory
            ]
        };
    */

    var distillInfo = {
        competencyType : scenarioInfo.cType,
        teacherFeedbackCode: scoreInfo.teacherFeedbackCode,
        note : scoreInfo.ratingText,
        bayes: {
            key: scenarioInfo.bayesFile,
            root: "category_systems_thinking",
            fragments: {
                "category_end_state": endStateValue,
                "category_process": processValue
            }
        }
    };

    // Returned the distilled info
    return distillInfo;
};

SC_Distiller.prototype.postProcess = function(distilled, bayesResults) {
    var compData = {};
    //console.log("postProcess distilled:", distilled);
    //console.log("postProcess bayesResults:", bayesResults);

    // Get the competency level
    var competencyLevel = 0;
    var maxValue = 0;
    for( var i = 0; i < bayesResults.bayesResults.length; i++ ) {
        if(bayesResults.bayesResults[i] > maxValue) {
            maxValue = bayesResults.bayesResults[i];
            competencyLevel = i + 1;
        }
    }

    // competency type
    compData.id = distilled.competencyType;
    compData.level = competencyLevel;
    compData.teacherFeedbackCode = distilled.teacherFeedbackCode;
    compData.studentFeedbackCode = distilled.teacherFeedbackCode;
    compData.data = { competencyLevel : competencyLevel, competencyType : distilled.competencyType };
    compData.note = distilled.note;

    var info =_.cloneDeep(distilled);
    info.bayes.posteriors = bayesResults.posteriors;
    info.bayes.bayesResults = bayesResults.bayesResults;
    compData.info = JSON.stringify(info);

    compData.timeSpentSec = 0;
    compData.numAttempts = 1;

    // TODO: add model version and distiller version
    // compData.version = this.version;

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