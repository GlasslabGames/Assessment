/**
 * Assessment Engine Module for Netica
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

function NeticaEngine(aeService, engineDir, options) {
    this.version = 0.01;

    this.engineDir = engineDir;
    this.aeService = aeService;

    Util = require( path.resolve(engineDir, '../../../core/util.js') );

    this.options = _.merge(
        { },
        options
    );
}

NeticaEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var currentResults = {};
    var distiller;
    var distilledData;
    this.aeService.getAssessmentResults(userId, gameId, "competency")
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
            if(!_distiller) return;
            distiller = _distiller; // save for later

            try {
                // TODO: maybe run in thread
                // Run distiller function
                distilledData = distiller.preProcess(eventsData);
                //console.log( "Distilled data:", JSON.stringify(distilledData, null, 2) );

                // If the distilled data has no bayes key, don't save anything
                if( !(distilledData && distilledData.bayes.key) ) {
                    console.log( "AssessmentEngine: NeticaEngine - No bayes key found in distilled data" );
                    resolve();
                    return;
                }
            } catch(err) {
                console.trace(err);
                reject(err);
                return;
            }

            // get bayes model
            return this.getBayesModel(gameId, distilledData.bayes.key);
        }.bind(this))

        // model loaded
        .then(function(modelData) {
            // skip if no data
            if(!modelData) return;

            // Set the command line string for the Netica processor
            var commandString = " AdvancedBayes";

            // add netica file length
            //commandString += " " + modelData.length;
            commandString += " ../games/" + gameId + "/bayes/" + distilledData.bayes.key + ".neta";

            // add root node
            commandString += " " + distilledData.bayes.root;

            // Add the posterior information
            var posteriorCount = 0;
            var posteriorCommand = "";

            // Get current posteriors, if they exist
            var posteriors = {};
            if( currentResults &&
                currentResults.results &&
                currentResults.results[ distilledData.competencyType ] &&
                currentResults.results[ distilledData.competencyType ].info ) {
                var resultsInfo = JSON.parse( currentResults.results[ distilledData.competencyType ].info );
                if( resultsInfo.bayes &&
                    resultsInfo.bayes.posteriors ) {
                    posteriors = resultsInfo.bayes.posteriors;
                    //console.log( "Results posteriors: " + JSON.stringify( posteriors ) );
                }
            }

            // Get the posteriors to check for
            var posteriorsToCheck = distilledData.bayes.posteriors;
            if( posteriorsToCheck ) {
                // Check each posterior set from the distiller
                for( var i in posteriorsToCheck ) {
                    posteriorCount++;
                    posteriorCommand += " " + i;

                    // See if this posterior exists in the current results
                    if( posteriors[ i ] ) {
                        // Add each posterior value to the command
                        for( var j = 0; j < posteriors[ i ].length; j++ ) {
                            posteriorCommand += " " + posteriors[ i ][ j ];
                        }
                    }
                    // It doesn't exist, set -1 as the value, which will be ignored on bayes calculations
                    else {
                        posteriorCommand += " -1";
                    }
                }
            }

            // Append the posteriors to the command string
            commandString += " " + posteriorCount + posteriorCommand;
            //console.log( "Command to run: ", commandString );

            // Delete the current posteriors from the distilled data
            delete distilledData.bayes.posteriors;

            // Use the distilled data to get the bayes key and evidence fragments to pass to the Netica server
            var evidenceFragments = distilledData.bayes.fragments;
            for(var i in evidenceFragments) {
                commandString += " " + i + " " + evidenceFragments[i];
            }

            // Before we trigger the Netica process, we need to make sure we set the current working directory
            // and execute the batch file or shell script, depending on the platform
            var scriptToExecute = '';
            var scriptCwd = this.engineDir + "build";
            console.log( "Executing bayes on " + process.platform + " at " + process.cwd() );
            if( process.platform === "win32" ) {
                scriptToExecute += 'run.bat';
            } else {
                scriptToExecute += './run.sh';
            }

            // run child process in promise
            var runNeticaPromise = when.promise( function(resolve2, reject2) {
                // Use the distilled data to get the bayes key and evidence fragments to pass to the Netica process
                console.log( "bayes file: ", distilledData.bayes.key );
                console.log( "AssessmentEngine: NeticaEngine - cwd:", scriptCwd );
                console.log( "AssessmentEngine: NeticaEngine - execute:", scriptToExecute + commandString );

                var aeNetica = child_process.exec( scriptToExecute + commandString,
                    {
                      cwd: scriptCwd
                    },
                    function( error, data, stderr ) {
                        console.log( "netica data: ", data );
                        console.log( "stderr: ", stderr );
                        if( error !== null ) {
                            console.log( "exec error: " + error );
                            reject2( error );
                        } else {
                            resolve2({distilled: distilledData, netica: data});
                        }
                    }.bind(this)
                );

                aeNetica.stdin.write(modelData);
                aeNetica.stdin.end();
            }.bind(this));

            return runNeticaPromise;
        }.bind(this))

        .then(function(data) {
            // skip if no data
            if(!data) return;

            try {
                data.netica = JSON.parse(data.netica);
                console.log( "AssessmentEngine: NeticaEngine - data.netica: " + data.netica );
                // process neticaResults and distilled Data
                var compData = distiller.postProcess(data.distilled, data.netica);
                compData.timestamp = Util.GetTimeStamp();

                var out = {};
                out[compData.id] = compData;

                // done
                resolve(out);
            } catch(err) {
                // invalid json data
                console.error("AssessmentEngine: NeticaEngine - Invalid Competency JSON data - Error:", err);
                reject(err);
            }
        }.bind(this))

        // catch all errors
        .then(null, reject);

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


NeticaEngine.prototype.getBayesModel = function(gameId, modelName){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        try{
            console.log("AssessmentEngine: NeticaEngine - getBayesModel cwd:", process.cwd());
            var file = this.engineDir + "games"+path.sep + gameId + path.sep+"bayes"+path.sep + modelName+".neta";
            fs.readFile(file, 'utf-8', function(err, fileData){
                if(err) {
                    reject(err);
                    return;
                }

                resolve(fileData);
            }.bind(this));
        } catch(err) {
            console.error("AssessmentEngine: NeticaEngine - Load Netica Files Error -", err);
            reject(err);
        }
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

NeticaEngine.prototype.getDistillerFunction = function(gameId){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    try{
        console.log("AssessmentEngine: NeticaEngine - getDistillerFunction cwd:", process.cwd());
        var file = this.engineDir + "games"+path.sep + gameId + path.sep+"distiller.js";
        var sc = require(file);

        resolve( new sc() );
    } catch(err) {
        console.error("AssessmentEngine: NeticaEngine - Get Distiller Function Error -", err);
        reject(err);
    }
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

module.exports = NeticaEngine;