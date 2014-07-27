/**
 * Assessment Module
 *
 *
 */
module.exports = {
    LongName:    "Assessment-Engine",
    ServiceName: "aeng",
    Controller: {
        queue: require('./controller/queue.js')
    },
    Service:     require('./assessment.service.js'),
    Const:      require('./assessment.const.js'),

    Datastore: {
        Couchbase: require('./assessment.datastore.couchbase.js')
    },
    Queue: {
        Redis: require('./assessment.queue.redis.js')
    }
};
