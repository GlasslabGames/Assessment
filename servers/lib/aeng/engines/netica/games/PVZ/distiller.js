/**
 * Assessment Plants vs. Zombies EDU Distiller Module
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

module.exports = PVZ_Distiller;

function PVZ_Distiller()
{
    // Glasslab libs
}

PVZ_Distiller.prototype.preProcess = function(sessionsEvents)
{
    var events = sessionsEvents[0];
    console.log("Starting preProcess");

    // Indicator human-readable name to code
    var indicatorCodes = {
        "InvalidPlantingAttemptRatio": 2,
        "PercentSunflowersInBack": 3,
        "PercentTombstonePlants": 4,
        "RatioUpgradedOrAoePlantsSelected": 5,
        "UsedExplosivePlants": 6,
        "RatioExplosivePlantsSelected": 6,
        "PercentSunCollected": 7,
        "PlantedSunflowersBeforeWave": 8,
        "PercentPlantFoodCollected": 9,
        "PercentTimeConveyorIsFull": 11,
        "PercentLowDangerPlantFoodUsage": 12,
        "PercentHighDangerPlantFoodUsage": 13,
        "PercentLowDangerPowerUsage": 14,
        "PercentHighDangerPowerUsage": 15,
        "PercentHighDamagePlantsInDangerRows": 16,
        "PercentToughPlantsInDangerRows": 17,
        "PlantLayout": 21,
        "ReplacedPlantsWithUpgrades": 29,
        "UsedIceburgOrWallnutToCoverSpringbean": 30,
        "CoconutHitMoreThan3Zombies": 31,
        "PlantedBonkChoyToZombieRight": 32,
        "PercentSuccessfulPotatoMines": 33,
        "UsedIcebergToExtinguishExplorer": 35,
        "UsedSpikesToKillBarrels": 36,
        "PlantedIceburgInSnapdragonRange": 37,
        "PlantedSpringbeanNextToWater": 38,
        "UsedIceburg5secAfterCooldown": 41,
        "PercentTwinSunflowers": 42,
        "UsedPlantFoodOnSunflower": 42,
        "ReplantedPlantsToDestroyedPlants": 43,
        "ReplacedResourceWithOffensiveDuringIntenseFight": 44,
        "PlantLayoutImprovement": 45,
        "PlantedSunflowersBeforeWaveImprovement": 46

    };

    /*
    var bayesInfo = {
        bayesFile: bayesFile,
        evidenceFragments: [
            endStateCategory,
            combinedRRCategory
        ]
    };
    */

    var levelId = "";
    var distilledData = {};
    var computationData = {}; // use this to track counts, etc as we look through the events

    // default to false if we don't count enough of these events
    distilledData.ReplacedPlantsWithUpgrades = false;
    distilledData.ReplacedResourceWithOffensiveDuringIntenseFight = true;

    // Process data through distiller function
    var eventsList = events.events;
    for( var i = 0; i < eventsList.length; i++ ) {
        // Get the event name
        var eventName = eventsList[i].name;
        var eventData = eventsList[i].eventData;
        //console.log("\neventName:", eventName, "eventData:",eventData);

        // Check the name of the level to pass to the Bayes file
        if( eventName == "Event_level_end" ) {
            if( eventData.hasOwnProperty( "id" ) ) {
                levelId = eventData.id;
            }
        }

        // Special cases where we're doing some checks in the distiller for the sake of flexibility

        // #21 = sun x < offensive x < defensive x
        // #45 = improvement on 21
        if (eventName == "Indicator_plant_layout_mistakes") {
            var value = eventData.floatValue;
            distilledData.PlantLayout = 1 - value; // reverse

            // if they're replaying a failed level, figure out if they improved on this indicator since last time
            if (eventData.isReplayingFailedLevel) {
                var prevValue = eventData.prevValue;
                value = ((prevValue - value) + 1) / 2; // old value - new value.
                    // Result is 0 if they went from 0 mistakes to 3 and 1 if they went from 3 mistakes to 0.
                distilledData.PlantLayoutImprovement = value;
            }
        }
        // #2
        else if (eventName == "Indicator_percent_invalid_planting_attempts")
        {
            // Invert for bayes net calculation
            distilledData.InvalidPlantingAttemptRatio = 1-eventData.value;
        }
        // #8 = plant 3 sunflowers before 2nd wave
        // #46 = improvement on 8
        else if (eventName == "Indicator_sunflowers_at_wave") {
            var wave = eventData.wave;
            if (wave == 2) {
                if (eventData.hasOwnProperty("numSunflowers") &&
                    eventData.hasOwnProperty("prevNumSunflowers")) {
                    // TODO numSunFlowers is not defined? I don't know why since it's added as a value to the telemetry.
                    var result = eventData.numSunflowers >= 3;
                    distilledData.PlantedSunflowersBeforeWave = result;

                    // if they're replaying a failed level, figure out if they improved on this indicator since last time
                    if (eventData.isReplayingFailedLevel) {
                        var prevResult = eventData.prevNumSunflowers >= 3;
                        result = ((result - prevResult) + 1) / 2; // new value - old value. 0: decline, 0.5: no change, 1: improvement
                        distilledData.PlantedSunflowersBeforeWaveImprovement = result;
                    }
                }
                else {
                    console.error("Indicator for sunflowers was found, but could not find numSunflowers and/or prevNumSunflowers.");
                }
            }
        }
        // #29 = true if they replace at least 2 non-upgraded plants with upgraded ones
        // #44 = true if they replace resource plants with offensive plants during an intense fight
        else if (eventName == "Action_replace_plant") {
            if (parseFloat(eventData.time) <= 3) { // if they replaced it within 3 secs
                if (eventData.isUpgrade) {
                    if (!computationData.numReplaceUpgrades) computationData.numReplaceUpgrades = 1;
                    else computationData.numReplaceUpgrades++;
                    if (computationData.numReplaceUpgrades >= 2) {
                        distilledData.ReplacedPlantsWithUpgrades = true;
                    }
                }
                if (eventData.replacingResourceWithOffensiveDuringIntenseFight) {
                    if (!computationData.numReplaceResourceWithOffensive) computationData.numReplaceResourceWithOffensive = 1;
                    else computationData.numReplaceResourceWithOffensive++;
                    if (computationData.numReplaceResourceWithOffensive >= 2) {
                        distilledData.ReplacedResourceWithOffensiveDuringIntenseFight = true;
                    }
                }
            }
        }
        // #42a = true if they use plantfood on a sunflower once
        else if (eventName == "Action_use_plant_food") {
            if (eventData.type == "sunflower" || eventData.type == "twinsunflower") {
                distilledData.UsedPlantFoodOnSunflower = true;
            }
        }
        // #7 = ratio of collected sun to spawned sun
        else if (eventName == "Action_pick_gen_sun" || eventName == "Action_pick_fallen_sun") {
            if (!computationData.numSunCollected) computationData.numSunCollected = 1;
            else computationData.numSunCollected ++;
        }
        else if (eventName == "Event_fallen_sun" || eventName == "Event_gen_sun") {
            if (!computationData.numSunGenerated) computationData.numSunGenerated = 1;
            else computationData.numSunGenerated ++;
        }


        // Reversed indicators

        // #11 = amount of time that the conveyor is full out of the whole level time
        else if (eventName == "Indicator_percent_time_conveyor_is_full") {
            distilledData.PercentTimeConveyorIsFull = 1 - eventData.floatValue; // reversed
        }
        // #12 = ratio of plant food used in low danger / all plant food used
        else if (eventName == "Indicator_percent_low_danger_plant_food_usage") {
            distilledData.PercentLowDangerPlantFoodUsage = 1 - eventData.floatValue;
        }
        // #14 = ratio of powers used in low danger / all powers used
        else if (eventName == "Indicator_percent_low_danger_power_usage") {
            distilledData.PercentLowDangerPowerUsage = 1 - eventData.floatValue;
        }
        // #37 = number of icebergs near snapdragon / all icebergs
        else if (eventName == "Indicator_planted_iceburg_in_snapdragon_range") {
            distilledData.PlantedIceburgInSnapdragonRange = 1 - eventData.floatValue;
        }

        // Fallback for indicators
        else if (eventName.indexOf("Indicator_") == 0)
        {
            var eventNamePieces = eventName.split("_");
            eventNamePieces[0] = ""; // Get rid of "Indicator"
            // Convert to CamelCase
            for (var j=0; j < eventNamePieces.length; j++)
            {
                var piece = eventNamePieces[j];
                piece = piece.charAt(0).toUpperCase() + piece.slice(1);
                eventNamePieces[j] = piece;
            }
            var distilledEventName = eventNamePieces.join("");

            var distilledValue;
            console.log("Distilled event name: "+distilledEventName);
            if (eventData.hasOwnProperty("value"))
            {
                distilledValue = eventData.value;
            }
            else if (eventData.hasOwnProperty("floatValue"))
            {
                distilledValue = eventData.floatValue;
            }
            else if (eventData.hasOwnProperty("boolValue"))
            {
                distilledValue = eventData.boolValue;
            }
            else if (eventData.hasOwnProperty("intValue"))
            {
                distilledValue = eventData.intValue;
            }

            distilledData[distilledEventName] = distilledValue;
        }
    }

    // If a level Id is not present, ignore
    if( levelId == "" ) {
        return {};
    }

    // Parse collected info
    // #42 = ratio of collected sun to spawned sun. Note that this may have been set incorrectly by
    //      Indicator_percent_sun_collected (which used to be broken), but in that case we'll just overwrite it
    if (computationData.numSunGenerated) {
        distilledData.PercentSunCollected = (computationData.numSunCollected + 0) / (computationData.numSunGenerated + 0);
    } else {
        distilledData.PercentSunCollected = 1; // if no sun fell for some reason, they technically collected all of it
    }

    var qMatrix = {
        "W1D1": [ 3, 7, 8, 21, 33, 43, 45, 46 ],
        "W1D2": [ 3, 7, 8, 12, 21, 33, 43, 45, 46 ],
        "W1D3": [ 2, 3, 7, 8, 9, 12, 13, 21, 33, 43, 45, 46 ],
        "W1D4": [ 2, 9, 11, 12, 13, 33, 43 ],
        "W1D6": [ 2, 3, 4, 7, 8, 9, 12, 13, 14, 15, 21, 33, 43, 44, 45, 46 ],
        "W1D8": [ 2, 9, 11, 13, 15, 17, 33, 43 ],
        "W1D9": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 17, 21, 33, 35, 43, 44, 45, 46 ],
        "W1D10": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 17, 21, 33, 35, 43, 44, 45, 46 ],
        "W1D11": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 17, 21, 33, 35, 43, 44, 45, 46 ],
        "W1D12": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 17, 21, 33, 35, 43, 44, 45, 46 ],
        "W1D13": [ 2, 7, 8, 9, 12, 13, 14, 15, 17, 33, 43, 44, 46 ],
        "W1D14": [ 2, 3, 4, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 33, 43, 44, 45, 46 ],
        "W1D15": [ 2, 4, 7, 9, 12, 13, 14, 15, 16, 17, 21, 29, 32, 33, 43, 44, 45 ],
        "W1D17": [ 2, 3, 4, 5, 7, 9, 12, 13, 14, 15, 16, 17, 21, 29, 32, 33, 43, 44, 45, 46 ],
        "W1D18": [ 2, 4, 5, 13, 15, 32, 33 ],
        "W1D19": [ 2, 5, 7, 12, 13, 14, 15, 16, 17, 29, 32, 33, 44 ],
        "W1D20": [ 2, 7, 9, 12, 13, 14, 15, 16, 17, 29, 32, 33, 35, 43 ],
        "W1D21": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 21, 29, 43, 44, 45, 46 ],
        "W1D22": [ 2, 4, 5, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 32, 33, 43, 44, 46 ],
        "W1D24": [ 2, 4, 5, 12, 13, 14, 15, 32, 35 ],
        "W1D25": [ 2, 9, 11, 12, 13, 14, 15, 16, 17, 32, 43 ],
        "W2D1": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 29, 32, 43, 44, 45, 46 ],
        "W2D2": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 29, 32, 43, 44, 45, 46 ],
        "W2D4": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 29, 32, 37, 43, 44, 45, 46 ],
        "W2D5": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 43, 44, 45, 46 ],
        "W2D6": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 29, 32, 37, 43, 44, 45, 46 ],
        "W2D7": [ 2, 3, 7, 8, 9, 12, 14, 16, 17, 21, 29, 32, 36, 37, 43, 44, 45, 46 ],
        "W2D8": [ 2, 9, 11, 12, 13, 14, 15, 16, 17, 33, 36, 43, 45, 46 ],
        "W2D9": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 32, 37, 43, 44, 45, 46 ],
        "W2D10": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 32, 37, 38, 43, 44, 45, 46 ],
        "W2D12": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 31, 32, 36, 37, 38, 43, 44, 45, 46 ],
        "W2D13": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 24, 29, 30, 31, 32, 37, 38, 42, 43, 44, 45, 46 ], //use 42a, 42=42a
        "W2D14": [ 2, 5, 9, 12, 13, 14, 15, 16, 17, 32, 38, 43, 45, 46 ],
        "W2D15": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 31, 32, 37, 38, 43, 44, 45, 46 ],
        "W2D16": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 31, 32, 36, 37, 38, 43, 44, 45, 46 ],
        "W2D17": [ 2, 3, 6, 7, 8, 9, 12, 13, 14, 15, 17, 21, 29, 30, 31, 32, 36, 37, 38, 45, 46 ],
        "W2D18": [ 2, 7, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 38, 45, 46 ],
        "W2D19": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 24, 29, 30, 31, 36, 37, 38, 43, 44, 45, 46 ], //24-42 - use 24
        "W2D21": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 24, 29, 30, 31, 36, 37, 38, 43, 44, 45, 46 ], //24-42 - use 24
        "W2D22": [ 2, 5, 9, 12, 13, 14, 15, 31, 38 ],
        "W2D23": [ 2, 3, 7, 8, 9, 12, 13, 14, 15, 16, 17, 21, 29, 30, 31, 36, 37, 38, 43, 44, 45, 46 ],
        "W2D24": [ 2, 3, 8, 9, 11, 12, 13, 14, 15, 16, 17, 21, 29, 30, 31, 36, 37, 38, 43, 44, 45, 46 ]
    };

    // convert to fragments to send distiller TODO: filter based on level
    var fragments = {};
    var value, intValue;
    for (var key in distilledData) {
        // Only proceed if the code is used in the Q-Matrix
        var code = indicatorCodes[ key ];
        if( qMatrix[ levelId ].indexOf( code ) == -1 ) {
            continue;
        }

        value = distilledData[key];
        if (typeof value == "boolean") {
            intValue = (value)? 0 : 1; // true -> 0, false -> 1 (conforming to the yes/no order in bayes)
        } else { // assume it's a float btw 0 and 1
            if (value <= 0.25) intValue = 3;
            else if (value <= 0.5) intValue = 2;
            else if (value <= 0.75) intValue = 1;
            else intValue = 0;
            // spelling out the cases in order to conform exactly to the spec and handle edge cases gracefully
        }

        // Get the stringified indicator code and set the fragment
        code = "I" + code;
        fragments[ code ] = intValue;
        console.log("\nAdding fragment",key,"(",code,"):",value,"->",intValue);
    }

    var distillInfo = {
        bayes: {
            key: levelId,
            root: "ProblemSolving",
            fragments: fragments
        }
    };

    // return distilled data
    return distillInfo;
};

PVZ_Distiller.prototype.postProcess = function(distilled, bayesResults) {
    var compData = {};
    //console.log("postProcess distilled:", distilled);
    //console.log("postProcess wekaResults:", wekaResults);

    /*// Get the competency level
    var competencyLevel = 0;
    var maxValue = 0;
    for( var i = 0; i < wekaResults.length; i++ ) {
        if(wekaResults[i] > maxValue) {
            maxValue = wekaResults[i];
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
    info.bayes.wekaResults = wekaResults;
    compData.info = JSON.stringify(info);

    compData.timeSpentSec = 0;
    compData.numAttempts = 1;

    // TODO: add model version and distiller version
    // compData.version = this.version;*/

    return compData;
};