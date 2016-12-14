/**
 * Assessment Module
 *
 *
 */
var path       = __dirname;
module.exports = {
    LongName:    "Assessment-Engine",
    ServiceName: "aeng",
    Controller: {
        queue: require(path + '/controller/queue.js')
    },
    Service:     require(path + '/assessment.service.js'),
    Const:      require(path + '/assessment.const.js'),

    Datastore: {
        Couchbase: require(path + '/assessment.datastore.couchbase.js')
    },
    Queue: {
        Redis: require(path + '/assessment.queue.redis.js')
    }
};
