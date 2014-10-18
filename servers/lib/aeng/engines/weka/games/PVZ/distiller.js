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

    /*
    var bayesInfo = {
        bayesFile: wekaFile,
        evidenceFragments: [
            endStateCategory,
            combinedRRCategory
        ]
    };
    */

    var distilledData = {};

    console.log("=========TEST=========");
    // Process data through distiller function
    var eventsList = events.events;
    for( var i = 0; i < eventsList.length; i++ ) {
        // Get the event name
        var eventName = eventsList[i].name;
        var eventData = eventsList[i].eventData;

        // TODO: Test, not sure if this is correct way to identify data
        if( eventName == "Indicator_percent_successful_potato_mines" ) {
            distilledData.SuccessfulMinesRatio = eventData.value;
        }
        else if (eventName == "Indicator_percent_sun_collected") {
            distilledData.SunCollectedRatio = eventData.value;
        }
        else if (eventName == "Indicator_percent_sunflowers_in_back") {
            distilledData.RearSunflowersRatio = eventData.value;
        }

        /***** Following indicators are owned by Rose *****/
        // #21 = sun x < offensive x < defensive x
        // #45 = improvement on 21
        else if (eventName == "Indicator_plant_layout") {
            var value = parseFloat(eventData.value);
            distilledData.PlantLayout = value;

            // if they're replaying a failed level, figure out if they improved on this indicator since last time
            if (eventData.isReplayingFailedLevel) {
                var prevValue = parseFloat(eventData.prevValue);
                value -= prevValue; // new value - old value. Result is between -1 and 1.
                distilledData.PlantLayoutImprovement = value;
            }
        }
        // #8 = plant 3 sunflowers before 2nd wave
        // #46 = improvement on 8
        else if (eventName == "Indicator_sunflowers_at_wave") {
            var wave = parseInt(eventData.wave);
            if (wave == 2) {
                if (eventData.hasOwnProperty("numSunflowers") &&
                    eventData.hasOwnProperty("prevNumSunflowers"))
                {
                    // TODO numSunFlowers is not defined?
                    var result = parseInt(eventData.numSunflowers) >= 3;
                    distilledData.PlantSunflowersBeforeWave = result;

                    // if they're replaying a failed level, figure out if they improved on this indicator since last time
                    if (eventData.isReplayingFailedLevel) {
                        var prevResult = parseInt(eventData.prevNumSunflowers) >= 3;
                        result -= prevResult; // new value - old value. -1: decline, 0: no change, 1: improvement
                        distilledData.PlantSunflowersBeforeWaveImprovement = result;
                    }
                }
                else
                {
                    console.error("Indicator for sunflowers was found, but could not find numSunflowers and/or prevNumSunflowers.");
                }
            }
        }
        // #43 = replaced plants / destroyed plants
        else if (eventName == "Indicator_replaced_plants_to_destroyed_plants") {
            distilledData.ReplacedPlantsToDestroyedPlants = parseFloat(eventData.value);
        }
    }

    var distillInfo = {
        /*competencyType : cType,
        teacherFeedbackCode: teacherFeedbackCode,
        note : ratingText,
        bayes: {
            key: wekaFile,
            root: "category_sys_mod",
            fragments: {
                "category_end_state": endStateCategory,
                "category_remove_replace": combinedRRCategory
            }
        }*/
    };

    // return distilled data
    return distillInfo;
};

PVZ_Distiller.prototype.postProcess = function(distilled, wekaResults) {
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