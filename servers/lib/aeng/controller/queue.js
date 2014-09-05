
var _      = require('lodash');
var when   = require('when');
//
var Util   = require('../../core/util.js');

module.exports = {
    addToQueue:   addToQueue,
    addActivity:  addActivity
};

var exampleInput = {};

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

        //console.log("Collector: pushJob gameSessionId:", jdata.gameSessionId, ", score:", score);
        this.queue.pushJob(jobType, userId, gameId, gameSessionId)
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

