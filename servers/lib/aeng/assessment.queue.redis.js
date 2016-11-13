/**
 * Assessment Queue Module
 *
 * Module dependencies:
 *  lodash     - https://github.com/lodash/lodash
 *  redis      - https://github.com/mranney/node_redis
 *  when       - https://github.com/cujojs/when
 *
 */
// Third-party libs
var _     = require('lodash');
var redis = require('redis');
var when  = require('when');
// Glasslab libs
var aeConst;

module.exports = AE_Queue;

function AE_Queue(options){
    aeConst = require('./assessment.js').Const;

    this.options = _.merge(
        {
            port: null,
            host: null,
            db: 0,
            sessionExpire: 14400000
        },
        options
    );

    this.q = redis.createClient(this.options.port, this.options.host, this.options);

    this.keyQIn      = aeConst.keys.assessment+":"+aeConst.keys.qin;
    this.keyActivity = aeConst.keys.assessment+":"+aeConst.keys.activity;

    if(this.options.db) {
        this.q.select(this.options.db);
    }
}

AE_Queue.prototype.pushJob = function(jobType, jobData){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------
    //common payload properties
    var payload = {
        jobType: jobType,
        qType:   aeConst.queue.end
    };
    _.merge(payload, jobData);

    // all ok, now add end to
    this.q.lpush(this.keyQIn, JSON.stringify(payload),
        function(err) {
            if(err) {
                console.error("Queue: End Error -", err);
                reject(err);
                return;
            }
            resolve();
        }.bind(this)
    );

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AE_Queue.prototype.isEnded = function(data) {
    if(!data) { return false; }

    return (data.qType == aeConst.queue.end);
};

AE_Queue.prototype.getJobCount = function() {
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    this.q.llen(this.keyQIn, function(err, count){
        if(err) {
            console.error("Queue: Error:", err);
            reject(err);
            return;
        }

        resolve(count);
    }.bind(this));
// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AE_Queue.prototype.popJob = function(){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // pop in item off telemetry queue
    this.q.rpop(this.keyQIn, function(err, data){
        if(err) {
            console.error("Queue: getTelemetryBatch Error:", err);
            reject(err);
            return;
        }

        // if telemetry has data
        if(data) {
            // convert string to object
            try {
                data = JSON.parse(data);
            } catch(err) {
                console.error("Queue: getTelemetryBatch Error -", err, ", JSON data:", data);
                reject(err);
                return;
            }
            //console.log("popJob data:", data);

            resolve(data);
        } else {
            resolve({});
        }
    }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AE_Queue.prototype.clearJobs = function(){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // pop in item off telemetry queue
    this.q.del(this.keyQIn, function(err, data){
        if(err) {
            console.error("Queue: getTelemetryBatch Error:", err);
            reject(err);
            return;
        }

        resolve(data);
    }.bind(this));

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};


AE_Queue.prototype.addActivity = function(userId, gameId, gameSessionId){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        // all ok, now add end to
        this.q.hset(this.keyActivity,
                "g:"+gameId+":u:"+userId+":a:"+gameSessionId,
            JSON.stringify({
                gameSessionId: gameSessionId,
                gameId:  gameId,
                userId:  userId
            }),
            function(err) {
                if(err) {
                    console.error("Hash: End Error -", err);
                    reject(err);
                    return;
                }
                resolve();
            }.bind(this)
        );

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
};

AE_Queue.prototype.getActivity = function(){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // all ok, now add end to
    this.q.hgetall(this.keyActivity,
        function(err, data) {
            if(err) {
                console.error("Hash: End Error -", err);
                reject(err);
                return;
            }

            if(data) {
                //console.log("getActivity data:", data);
                var outList = [];
                try {
                    for(var i in data) {
                        // convert string to object
                        // add to out list
                        outList.push( JSON.parse(data[i]) );
                    }
                } catch(err) {
                    console.error("Queue: getActivity Error -", err, ", JSON data:", data);
                    reject(err);
                    return;
                }
                //console.log("getActivity outList:", outList);

                resolve(outList);
            } else {
                resolve([]);
            }
        }.bind(this)
    );

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};

AE_Queue.prototype.clearActivity = function(){
// add promise wrapper
return when.promise(function(resolve, reject) {
// ------------------------------------------------

    // all ok, now add end to
    this.q.del(this.keyActivity,
        function(err, data) {
            if(err) {
                console.error("clearActivity: Error -", err);
                reject(err);
                return;
            }

            resolve(data);
        }.bind(this)
    );

// ------------------------------------------------
}.bind(this));
// end promise wrapper
};