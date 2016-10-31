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


module.exports = DRK12Engine;
