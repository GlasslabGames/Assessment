/**
 * Assessment Engine Module for Standards
 *
 */
var fs            = require('fs');
var path          = require('path');
var child_process = require('child_process');
// Third-party libs
var _       = require('lodash');
var when    = require('when');
// Glasslab libs
var Util;

function StandardsEngine(aeService, engineDir, options) {
    this.version = 0.01;

    this.engineDir = engineDir;
    this.aeService = aeService;

    Util = require( path.resolve(engineDir, '../../../core/util.js') );

    this.options = _.merge(
        { },
        options
    );
}

StandardsEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        var currentResults = {};
        var distiller;
        var distilledData;
        this.aeService.getAssessmentResults(userId, gameId, "standards")
            // existing competency results retrieved
            .then(function(_currentResults) {
                //console.log( "Current assessment results: ", JSON.stringify( _currentResults ) );
                if( _currentResults ) {
                    currentResults = _currentResults;
                }

                // get the distiller function
                return this.getDistillerFunction(gameId);
            }.bind(this))

            // distiller function loaded
            .then(function(_distiller) {
                // skip if no data
                if(!_distiller){
                    return;
                }

                distiller = _distiller; // save for later

                try {
                    // TODO: maybe run in thread
                    // Run distiller function
                    distilledData = distiller.preProcess(eventsData, currentResults);
                    //console.log( "Distilled data:", JSON.stringify(distilledData, null, 2) );

                    // If the distilled data has no bayes key, don't save anything
                    var standardsData = distiller.postProcess(distilledData);
                    standardsData.timestamp = Util.GetTimeStamp();

                    // done
                    resolve(standardsData);
                } catch(err) {
                    console.error("AssessmentEngine: StandardsEngine - Invalid Standards JSON data - Error:", err);
                    reject(err);
                }

            }.bind(this))

            // catch all errors
            .then(null, reject);

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

StandardsEngine.prototype.getDistillerFunction = function(gameId){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        try{
            console.log("AssessmentEngine: StandardsEngine - getDistillerFunction cwd:", process.cwd());
            var file = this.engineDir + "games"+path.sep + gameId + path.sep+"distiller.js";
            var sc = require(file);

            resolve( new sc() );
        } catch(err) {
            console.error("AssessmentEngine: StandardsEngine - Get Distiller Function Error -", err);
            reject(err);
        }
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

module.exports = StandardsEngine;
