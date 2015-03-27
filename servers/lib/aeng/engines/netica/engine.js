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

                // Get the previously completed level and pass it into the distiller
                var existingData = {};
                if( currentResults &&
                    currentResults.results &&
                    currentResults.results.cps &&
                    currentResults.results.cps.level &&
                    currentResults.results.cps.completionState ) {
                    existingData.level = currentResults.results.cps.level;
                    existingData.completionState = currentResults.results.cps.completionState;
                }

                // Run distiller function
                distilledData = distiller.preProcess(eventsData, existingData);
                //console.log( "Distilled data:", JSON.stringify(distilledData, null, 2) );

                // If the distilled data has no bayes key, don't save anything
                if( !(distilledData && distilledData.bayes && distilledData.bayes.key) ) {
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
            var commandString = " ProgressBayes";

            // add netica file length
            //commandString += " " + modelData.length;
            commandString += " ../games/" + gameId + "/bayes/" + distilledData.bayes.key + ".neta";

            // add root node
            commandString += " " + distilledData.bayes.root;

            // add facets if any exist
            if( distilledData.bayes.facets ) {
                var numFacets = distilledData.bayes.facets.length;
                commandString += " " + numFacets;
                for( var i = 0; i < numFacets; i++ ) {
                    commandString += " " + distilledData.bayes.facets[ i ];
                }
            }
            else {
                commandString += " 0";
            }

            // add the flag for previous level
            if( currentResults &&
                currentResults.results &&
                currentResults.results[ distilledData.competencyType ] &&
                currentResults.results[ distilledData.competencyType ].info ) {
                var resultsInfo = JSON.parse( currentResults.results[ distilledData.competencyType ].info );
                if( resultsInfo.bayes &&
                    resultsInfo.bayes.bayesResults &&
                    resultsInfo.bayes.bayesResults.modelBinary ) {
                    commandString += " true " + resultsInfo.bayes.bayesResults.modelBinary;
                }
                else {
                    commandString += " false 0";
                }
            }
            else {
                commandString += " false 0";
            }

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
            } else if( process.platform === "linux" ) {
                scriptCwd += "/linux_64";
                scriptToExecute += './run.sh';
            } else {
                scriptCwd += "/osx";
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
                            var neticaData = data.substring( data.indexOf( "{" ) );
                            resolve2({distilled: distilledData, netica: neticaData});
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
                console.log( "AssessmentEngine: NeticaEngine - data.netica: " + JSON.stringify( data.netica ) );
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