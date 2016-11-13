
var _      = require('lodash');
var when   = require('when');
//
var Util   = require('../../core/util.js');

module.exports = {
    addToQueue:     addToQueue,
    addActivity:    addActivity,
    processStatus:  processStatus
};

var exampleInput = {};

var QueueJobTypes = {
    'activity': {
        validate: function(req, res) {
            var data = {};
            if(!req.body.userId) {
                this.requestUtil.errorResponse(res, "missing userId");
                return;
            }
            data.userId = req.body.userId;

            if(!req.body.gameSessionId) {
                this.requestUtil.errorResponse(res, "missing gameSessionId");
                return;
            }
            data.gameSessionId = req.body.gameSessionId;

            if(!req.body.gameId) {
                this.requestUtil.errorResponse(res, "missing gameId");
                return;
            }
            data.gameId = req.body.gameId;
            return data;
        }
    },
    'reprocess': {
        validate: function(req, res) {
            var data = {};
            if(!req.body.gameId) {
                this.requestUtil.errorResponse(res, "missing gameId");
                return;
            }
            data.gameId = req.body.gameId;
            return data;
        }
    }
};

exampleInput.addToQueue = {
    jobType:  "endSession",
    userId: 25,
    gameId: "AA-1",
    gameSessionId:  "ASD-123-QWER"
};
function addToQueue(req, res){
    try {

        if(!req.body.jobType) {
            this.requestUtil.errorResponse(res, "missing jobType");
            return;
        }
        var jobType = req.body.jobType;

        if (!jobType in QueueJobTypes) {
            this.requestUtil.errorResponse(res, "unknown jobType");
            return;
        }

        var jobData = QueueJobTypes[jobType].validate.bind(this)(req, res);
        if (!jobData) {
            return;
        }
        if ('gameId' in jobData) {
            // gameId is not case sensitive
            jobData.gameId = jobData.gameId.toUpperCase();
        }

        //console.log("Collector: pushJob gameSessionId:", jdata.gameSessionId, ", score:", score);
        this.queue.pushJob(jobType, jobData)
            // all done
            .then( function() {
                this.requestUtil.jsonResponse(res, {});
                return;
            }.bind(this) )

            // catch all errors
            .then(null, function(err) {
                console.error("Assessment Engine: Add To Queue Error:", err);
                this.requestUtil.errorResponse(res, err, 500);
            }.bind(this) );

    } catch(err) {
        console.trace("Assessment Engine: Add To Queue Error -", err);
        this.requestUtil.errorResponse(res, "Add To Queue Error", 500);
    }
};

exampleInput.addActivity = {
    userId: 25,
    gameId: "AA-1",
    gameSessionId:  "ASD-123-QWER"
};
function addActivity(req, res){
    try {

        if(!req.body.userId) {
            this.requestUtil.errorResponse(res, "missing userId");
            return;
        }
        var userId = req.body.userId;

        if(!req.body.gameSessionId) {
            this.requestUtil.errorResponse(res, "missing gameSessionId");
            return;
        }
        var gameSessionId = req.body.gameSessionId;

        if(!req.body.gameId) {
            this.requestUtil.errorResponse(res, "missing gameId");
            return;
        }
        var gameId = req.body.gameId;
        // gameId is not case sensitive
        gameId = gameId.toUpperCase();

        this.queue.addActivity(userId, gameId, gameSessionId)
            // all done
            .then( function() {
                this.requestUtil.jsonResponse(res, {});
                return;
            }.bind(this) )

            // catch all errors
            .then(null, function(err) {
                console.error("Assessment Engine: Add Activity Error:", err);
                this.requestUtil.errorResponse(res, err, 500);
            }.bind(this) );

    } catch(err) {
        console.trace("Assessment Engine: Add Activity Error -", err);
        this.requestUtil.errorResponse(res, "Add Activity Error", 500);
    }
};

function processStatus(req, res){
    this.queue.getJobCount()
    .then(function(count) {
        this.requestUtil.jsonResponse(res, { jobCount: count });
    }.bind(this))
    .then(null, function(err) {
        console.error("Assessment Engine: getJobCount Error:", err);
        this.requestUtil.errorResponse(res, err, 500);
    }.bind(this));
}


