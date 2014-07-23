/**
 * Request Util Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *
 */
var http       = require('http');
var urlParser  = require('url');
var path       = require('path');
// Third-party libs
var _          = require('lodash');

module.exports = RequestUtil;

function RequestUtil(options){
    this.options = _.merge(
        {
            request: { httpTimeout: 5000 }
        },
        options
    );
}

RequestUtil.prototype.errorResponse = function(res, obj, code){
    // default 400 error code
    if(!code) { code = 400; }

    if(_.isString(obj)) {
        try{
            // is string, try to convert to object
            obj = JSON.parse(obj);
        } catch(err) {
            // this is ok
        }
        obj = { status: "error", error: obj };
    }

    if(_.isObject(obj)) {
        // if object does not contain error, then set error to object
        if(!obj.error) {
            obj = { error: obj };
        }
    }

    this.jsonResponse(res, obj, code);
};

RequestUtil.prototype.jsonResponse = function(res, obj, code){
    var json = _.isObject(obj) ? JSON.stringify(obj) : obj;
    if(!code) { code = 200; }

    res.writeHead(code, {
        "Content-Type": "application/json"
    });
    res.end( json );
};

RequestUtil.prototype.getRequest = function(url, headers, done){
    var purl = urlParser.parse(url);

    var options = {
        protocol: purl.protocol,
        hostname: purl.hostname,
        port:     purl.port,
        path:     purl.path,
        method:   "GET",
        headers:  headers
    };

    //console.log("getRequest options:", options);
    this.sendRequest(options, null, null, done);
};

RequestUtil.prototype.postRequest = function(url, headers, jdata, done){
    var purl = urlParser.parse(url);
    var data = JSON.stringify(jdata);

    var options = {
        protocol: purl.protocol || "http:",
        hostname: purl.hostname || "localhost",
        port:     purl.port,
        path:     purl.path,
        method:   "POST",
        headers:  headers
    };

    //console.log("getRequest options:", options);
    this.sendRequest(options, data, null, done);
};

/*
RequestUtil.prototype.forwardPostRequest = function(url, jdata, resOut, done){
    var purl = urlParser.parse(url);
    var data = JSON.stringify(jdata);

    var options = {
        protocol: purl.protocol,
        hostname: purl.hostname,
        port:     purl.port,
        path:     purl.path,
        method:   "POST",
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    this.sendRequest(options, data, resOut, done);
};
*/

RequestUtil.prototype.sendRequest = function(options, data, resOut, done){

    var sreq = http.request(options, function(sres) {
        // handle attachments
        if(  sres.headers['content-disposition'] &&
            (sres.headers['content-disposition'].indexOf('attachment') != -1) ) {
            sres.setEncoding('binary');
        }

        //console.log("sendRequest statusCode:", sres.statusCode, ", headers:",  sres.headers);
        if(resOut) {
            // remove set cookie, but send rest
            delete sres.headers['set-cookie'];
            resOut.writeHead(sres.statusCode, sres.headers);
        }

        var data = "";
        sres.on('data', function(chunk){
            data += chunk;
            if(resOut) resOut.write(chunk);
        });

        sres.on('end', function(){
            if(resOut) resOut.end();
            // call done function if exist
            if(done) done(null, sres, data);
        });
    });

    sreq.on("error", function(err) {
        console.error("Auth: sendRequest Error -", err.message);
        if(resOut) {
            resOut.writeHead(500);
            resOut.end();
        }

        if(done) done(err);
    });

    // request timeout
    sreq.on('socket', function(socket) {
        socket.setTimeout(this.options.request.httpTimeout);
        socket.on('timeout', function() {
            sreq.abort();
            if(resOut) {
                resOut.writeHead(500);
                resOut.end();
            }
        });
    }.bind(this));

    if(data) {
        if(_.isObject(data)) {
            // convert data to string
            data = JSON.stringify(data);
        }

        if(data.length > 0) {
            sreq.write( data );
        }
    }

    sreq.end();
};
