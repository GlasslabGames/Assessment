/**
 * Assessment SimCity Distiller Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *
 */
var path    = require('path');
// Third-party libs
var _       = require('lodash');
var when    = require('when');
// Glasslab libs

module.exports = JavascriptEngine;

function JavascriptEngine(engineDir, options){
    this.engineDir = engineDir;

    this.options = _.merge(
        { },
        options
    );
}


JavascriptEngine.prototype.run = function(gameSessionId, gameId, eventsData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // load file and run
    try {
        //console.log("AssessmentEngine: Javascript_Engine - getDistillerFunction cwd:", process.cwd());
        var file = this.engineDir + "games"+path.sep + gameId+".js";
        var game = require(file);

        var g = new game(this.options);
        g.process(eventsData).then(resolve, reject);

    } catch(err) {
        console.error("AssessmentEngine: Javascript_Engine - Get Distiller Function Error -", err);
        reject(err);
    }

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
