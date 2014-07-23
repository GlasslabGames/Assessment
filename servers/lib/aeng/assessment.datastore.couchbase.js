
/**
 * Telemetry Couchbase Datastore Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  when   - https://github.com/cujojs/when
 *
 */
// Third-party libs
var _         = require('lodash');
var when      = require('when');
var couchbase = require('couchbase');
// load at runtime
var aeConst;

module.exports = AE_DS_Couchbase;

function AE_DS_Couchbase(options){
    // Glasslab libs
    aeConst = require('./assessment.const.js');

    this.options = _.merge(
        {
            host:     "localhost:8091",
            bucket:   "glasslab_assessment",
            password: "glasslab",
            timeout:  5000
        },
        options
    );
}

AE_DS_Couchbase.prototype.connect = function(){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    this.client = new couchbase.Connection({
        host:     this.options.host,
        bucket:   this.options.bucket,
        password: this.options.password,
        connectionTimeout: this.options.timeout || 5000,
        operationTimeout:  this.options.timeout || 5000
    }, function(err) {
        console.error("CouchBase Distiller DS: Error -", err);

        if(err) throw err;
    }.bind(this));

    this.client.on('error', function (err) {
        console.error("CouchBase Distiller DS: Error -", err);
        reject(err);
    }.bind(this));

    this.client.on('connect', function () {
        console.log("CouchBase Distiller DS connected!");
        resolve();
    }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};
