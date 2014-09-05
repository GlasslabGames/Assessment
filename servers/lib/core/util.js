/**
 * Util Module
 *
 * Module dependencies:
 *   when - https://github.com/cujojs/when
 *
 */
var url    = require('url');
var moment = require('moment');
var when   = require('when');
var _      = require('lodash');
var uuid   = require('node-uuid');

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function convertToString(item) {
    if(!item) {
        item = "";
    }
    else if(!_.isString(item)) {
        item = item.toString();
    }
    return item;
}

function promiseContinue(val){
    return when.promise( function(resolve){
        resolve(val);
    });
}

function createUUID() {
    return uuid.v1();
}

// build valid URI/URL
function buildUri(options, path) {
    var uri = "";

    if(options.protocol) {
        uri += options.protocol+"//";
    } else {
        uri += "http://";
    }

    if(options.host) {
        uri += options.host;
    } else {
        uri += "localhost";
    }

    if(options.port) {
        uri += ":"+options.port;
    }

    if(path && _.isString(path)) {
        // make sure first char is a slash
        if(path.charAt(0) != '/') {
            uri += "/";
        }
        uri += path;
    }

    return uri;
}

// seconds from Unix Epoch
function getTimeStamp(dt){
    if(!dt) {
        dt = moment.utc();
    } else if (dt instanceof Date) {
        dt = moment.utc(dt);
    }

    return dt.valueOf();
}

function getExpressLogger(options, express, stats){
    express.logger.token('remote-addy', function(req, res){
        if( req.headers.hasOwnProperty('x-forwarded-for') ){
            return req.headers['x-forwarded-for'];
        } else {
            return req.connection.remoteAddress;
        }
    });

    return express.logger(function(t, req, res){
        var rTime = t['response-time'](req, res);
        var contentLength = t['res'](req, res, 'content-length');
        var status = t['status'](req, res);
        var URL = t['url'](req, res);

        if(stats) {
            var pathname = url.parse(URL).pathname;
            // remove initial slash if it exists
            if(pathname.charAt(0) == '/') {
                pathname = pathname.slice(1);
            }
            // replace all double slashes with single
            pathname = pathname.replace(/\/\//g, '/');

            // create list delimitated by slashes so we can detect root and api
            var ulist = pathname.split('/');
            // capitalize each key
            if(ulist.length > 0) {
                // merge to dots
                pathname = ulist.join('.');
            } else {
                pathname = "_root";
            }

            stats.gauge("info", "Route.ResponseTime."+pathname, rTime);

            if(ulist.length > 0 &&
                ulist[0] == 'api') {
                stats.gauge("info", "Route.Api.ResponseTime", rTime);
            } else {
                stats.gauge("info", "Route.Static.ResponseTime", rTime);
            }

            stats.saveRoot();
            if(ulist.length > 0 &&
                ulist[0] == 'api') {
                stats.setRoot('Route.Api');
            } else {
                // static
                stats.setRoot('Route.Static');
            }
            stats.gauge("info", "ResponseTime", rTime);
            stats.restoreRoot();
        }

        // status is null
        if(!status) {
            console.error("Error null status for response!!!");
            status = "";
        }

        return t['remote-addy'](req, res)+' - - ['+
            t['date'](req, res)+'] "'+
            t['method'](req, res)+' '+
            URL+' HTTP/'+
            t['http-version'](req, res)+'" '+
            status+' '+
            (contentLength || '-')+' "'+
            (t['referrer'](req, res) || '-')+'" "'+
            (t['user-agent'](req, res) || '-')+'" ('+
            rTime+' ms)';
    });

    /*
     var logFormat = ':remote-addy - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" (:response-time ms)';
     return express.logger(logFormat);
     */
}

module.exports = {
    Request: require('./util.request.js'),
    Stats:   require('./util.stats.js'),
    Email:   require('./util.email.js'),
    ConvertToString:  convertToString,
    PromiseContinue:  promiseContinue,
    GetExpressLogger: getExpressLogger,
    GetTimeStamp:     getTimeStamp,
    BuildURI:         buildUri,
    CreateUUID:       createUUID,
    String: {
        capitalize: capitalize
    }
};
