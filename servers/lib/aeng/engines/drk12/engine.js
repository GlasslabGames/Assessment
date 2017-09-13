/**
 * Engine Module for the DRK12 reports
 *
 * File created by wiggins@concentricsky on Oct 26, 2016
 */

var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var _ = require('lodash');
var when = require('when');
var Util;
var util = require('util');
var JavascriptEngine = require('../javascript/engine');

//inherit from JavascriptEngine (which should probably be abstracted into a base and a 'sowo engine' added) -- Wiggins Oct2016

function DRK12Engine(aeService, engineDir, options) {
    // call super contructor
    JavascriptEngine.apply(this, arguments);
}
util.inherits(DRK12Engine, JavascriptEngine);

DRK12Engine.prototype.run = function(userId, gameId, gameSessionId, eventsData, aInfo){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        var g;
        var file;
        var game;
        var got_game;
        var distiller = aInfo.engine;
        var distiller_path = this.engineDir + "distillers"+path.sep + distiller+".js";

        try {
            if (!distiller) {
                got_game = false;
            } else {
                game = require(distiller_path);
                got_game = true;
            }
        } catch(err) {
            got_game = false;
        }

        // got_game = false;   // wip testing

        if(got_game) {

            // load file and run
            try {
                game = require(distiller_path);

                g = new game(this, this.aeService, this.options, aInfo);
                g.process(userId, gameId, gameSessionId, eventsData).then(resolve, reject);

            } catch(err) {
                console.error("AssessmentEngine: DRK12_Engine - Get Distiller Function Error -", err);
                reject(err);
            }
        } else {

            // auto process SOWO events
            this._processAutoSOWOs(this, userId, gameId, gameSessionId, eventsData, aInfo)
                .then(resolve, reject);
        }

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

module.exports = DRK12Engine;
