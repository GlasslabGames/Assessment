/**
 * Assessment SimCity Distiller Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *
 */
var fs      = require('fs');
var path    = require('path');
// Third-party libs
var _       = require('lodash');
var when    = require('when');

function WekaEngine(aeService, engineDir, options) {
    this.version = 0.01;

    this.engineDir = engineDir;
    this.aeService = aeService;

    this.options = _.merge(
        { },
        options
    );
}

WekaEngine.prototype.run = function(userId, gameId, gameSessionId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    var distiller;
    var distilledData;
    this.getDistillerFunction(gameId)
        .then(function(distiller) {
            // skip if no data
            if(!distiller) return;

            try {
                // TODO: maybe run in thread
                // Run distiller function
                distilledData = distiller.preProcess(eventsData);
                //console.log( "Distilled data:", JSON.stringify(distilledData, null, 2) );

                // If the distilled data has no WEKA key, don't save anything
                if( !(distilledData && distilledData.bayes.key) ) {
                    console.log( "AssessmentEngine: Weka_Engine - No bayes key found in distilled data" );
                    resolve();
                    return;
                }
            } catch(err) {
                reject(err);
                return;
            }

            //console.log("distilledData:", distilledData);
            // If the bayes key is empty, there is no WEKA to perform, resolve
            if( !distilledData || !distilledData.bayes.key ) {
                //console.log( "no bayes key found in weka data" );
                resolve();
                return;
            }

            // get weka model
            return this.getBayesModel(gameId, distilledData.bayes.key);
        }.bind(this))

        // model loaded
        .then(function(modelData) {
            // skip if no data
            if(!modelData) return;

            // Set the command line string for the WEKA processor
            var commandString = " SimpleBayes";

            // add weka file length
            commandString += " " + modelData.length;

            // add root node
            commandString += " " + distilledData.bayes.root;

            // Use the distilled data to get the bayes key and evidence fragments to pass to the WEKA server
            var evidenceFragments = distilledData.bayes.fragments;
            for(var i in evidenceFragments) {
                commandString += " " + i + " " + evidenceFragments[i];
            }

            // Before we trigger the WEKA process, we need to make sure we set the current working directory
            // and execute the batch file or shell script, depending on the platform
            var scriptToExecute = '';
            //console.log( "Executing bayes on " + process.platform + " at " + process.cwd() );
            if( process.platform === "win32" ) {
                scriptToExecute += 'run_assessment.bat';
            } else {
                scriptToExecute += './run_assessment.sh';
            }

            // run child process in promise
            var runWekaPromise = when.promise( function(resolve2, reject2) {
                // Use the distilled data to get the bayes key and evidence fragments to pass to the WEKA process
                //console.log( "bayes file: ", distilledData.bayes.key );
                console.log("AssessmentEngine: Weka_Engine - cwd:", process.cwd());
                console.log("AssessmentEngine: Weka_Engine - execute:", scriptToExecute + commandString );

                var aeWeka = child_process.exec( scriptToExecute + commandString,
                    function( error, data, stderr ) {
                        //console.log( "weka data: ", data );
                        //console.log( "stderr: ", stderr );
                        if( error !== null ) {
                            //console.log( "exec error: " + error );
                            reject2( error );
                        } else {
                            resolve2({distilled: distilledData, weka: data});
                        }
                    }.bind(this)
                );

                aeWeka.stdin.write(this.wekaFileData[distilledData.bayes.key]);
                aeWeka.stdin.end();
            }.bind(this));

            return runWekaPromise;
        }.bind(this))

        .then(function(data) {
            // skip if no data
            if(!data) return;

            try {
                data.weka = JSON.parse(data.weka);
                // process wekaResults and distilled Data
                var compData = distiller.postProcess(data.distilled, data.weka);

                // TODO: add model version and distiller version
                // compData.version = this.version;

                // done
                resolve(compData);
            } catch(err) {
                // invalid json data
                console.error("AssessmentEngine: Weka_Engine - Invalid Competency JSON data - Error:", err);
                reject(err);
            }
        }.bind(this))

        // catch all errors
        .then(null, reject);

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


WekaEngine.prototype.getBayesModel = function(gameId, modelName){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------
        try{
            console.log("AssessmentEngine: Weka_Engine - getBayesModel cwd:", process.cwd());
            var file = this.engineDir + "games"+path.sep + gameId + path.sep+"bayes"+path.sep + modelName+".xml";
            fs.readFile(file, 'utf-8', function(err, fileData){
                if(err) {
                    reject(err);
                    return;
                }

                resolve(fileData);
            }.bind(this));
        } catch(err) {
            console.error("AssessmentEngine: Weka_Engine - Load Weka Files Error -", err);
            reject(err);
        }
// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

WekaEngine.prototype.getDistillerFunction = function(gameId){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    try{
        console.log("AssessmentEngine: Weka_Engine - getDistillerFunction cwd:", process.cwd());
        var file = this.engineDir + "games"+path.sep + gameId + path.sep+"distiller.js";
        var sc = require(file);

        resolve( new sc() );
    } catch(err) {
        console.error("AssessmentEngine: Weka_Engine - Get Distiller Function Error -", err);
        reject(err);
    }
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

module.exports = WekaEngine;