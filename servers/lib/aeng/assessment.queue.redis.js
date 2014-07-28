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

    this.keyIn   = aeConst.keys.assessment+":"+aeConst.keys.in;

    if(this.options.db) {
        this.q.select(this.options.db);
    }
}

AE_Queue.prototype.pushJob = function(jobType, userId, gameSessionId, gameId){
// add promise wrapper
    return when.promise(function(resolve, reject) {
// ------------------------------------------------

        // all ok, now add end to
        this.q.lpush(this.keyIn,
            JSON.stringify({
                gameSessionId: gameSessionId,
                gameId:  gameId,
                userId:  userId,
                jobType: jobType,
                qType:   aeConst.queue.end
            }),
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

        this.q.llen(this.keyIn, function(err, count){
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
        this.q.rpop(this.keyIn, function(err, data){
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
                //console.log("Queue: getTelemetryBatch data:", data);

                resolve(data);
            }
        }.bind(this));

// ------------------------------------------------
    }.bind(this));
// end promise wrapper
}
