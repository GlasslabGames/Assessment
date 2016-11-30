/**
 * Argubot Academy DRK12 Report Module
 *
 */

var _       = require('lodash');
var when    = require('when');
var sqlite3 = require('sqlite3').verbose();

module.exports = AA_DRK12;


/*
 ** Source Document **
 * DRK12 Report B Reporting Rules - Rules v1
 * https://docs.google.com/spreadsheets/d/10YX2G35XzbhaOZqra9n2R8F2LYudy-4o0O3CJtcXJMY/edit#gid=0
 */

function AA_DRK12(engine, aeService, options, aInfo) {
    this.version = 0.1;
    this.aeService = aeService;
    this.options = _.merge({

    }, options);

    this.engine = engine;
    this.aInfo = aInfo;
}



AA_DRK12.prototype.process = function(userId, gameId, gameSessionId, eventsData) {
    var filterEventTypes = [
        "Give_schemetrainingevidence",
        "Fuse_core",
        "Launch_attack",
        "Use_backing",
        "Quest_start", "Quest_complete", "Quest_cancel"
    ];
    // always include one or more keys for a give type above
    var filterEventKeys = [
        "success",  //Give_schemetrainingevidence, Use_backing, Fuse_core, Launch_attack
        "weakness", //Fuse_core
        "type",     //Launch_attack
        "questId",  //Quest_start
    ];

    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.connecting_evidence_argument_schemes.bind(this),
        this.supporting_claims_with_evidence.bind(this),
        this.using_critical_questions.bind(this),
        this.using_backing.bind(this)
    ])
};

/*
 Competency: Connecting Evidence to Argument Schemes

 IN EVIDENCE GATHERING: complete ""give evidence"" actions
 IN BOT EQUIP: cores fused with claim/evidence pair

 action variable = ""give_schemetrainingevidence"";
     data variable is if targetscheme AND datascheme match = success - otherwise fail

 action variable = ""fuse_core"";
    data variable is success or weakness (irrelevant or inconsistent)

 if(count(select(Give_schemetrainingevidence OR Fuse_core = success)>=50% total # attempts)){green}
 if(count(select(Give_schemetrainingevidence OR Fuse_core = success)<50% total # attempts)){yellow}
 if(count(select(Give_schemetrainingevidence OR Fuse_core)=null)){grey}
 */
AA_DRK12.prototype.connecting_evidence_argument_schemes = function(engine, db) {
return when.promise(function(resolve, reject) {

    var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Give_schemetrainingevidence" \
            OR eventName="Fuse_core" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC';

    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.connecting_evidence DB Error:", err);
            reject(err);
            return;
        }


        var quests = this.collate_events_by_quest(results, function(e) {

            if (e.eventName == "Give_schemetrainingevidence") {
                return (e.eventData_Key == "success" && e.eventData_Value == "true");
            }
            else if (e.eventName == "Fuse_core" && e.eventData_key == "weakness") {
                return e.eventData_Value == "none";
            }

        });
        var questList = _.values(quests);

        resolve({
            "id": "connectingEvidence",
            "type": "skill",
            "quests": questList,
            "score": this.sum_scores(questList)
        })
    }.bind(this))

}.bind(this));
};


/*
 Competency: Supporting Claims with Evidence

 IN BATTLE: completed core attacks

 action variable = "launch_attack";
    data variable = true/false (core only)

 if(count(select(launch_attack (type = core_attack) = success)>=50% total # attempts)){green}
 if(count(select(launch_attack (type = core_attack) = success)<50% total # attempts)){yellow}
 if(count(select(launch_attack (type = core_attack))=null)){grey}

 */
AA_DRK12.prototype.supporting_claims_with_evidence = function(engine, db) {
    return this.distill_launch_attack_skill(engine, db, "supportingClaims", "CORE_ATTACK");
};


/*
 Competency: Using Critical Questions

 IN BATTLE: completed cq attacks

 action variable = "launch_attack";
    data variable = true/false (CQ)

 if(count(select(launch_attack (type = critical_question_attack) = success)>=50% total # attempts)){green}
 if(count(select(launch_attack (type = critical_question_attack) = success)<50% total # attempts)){yellow}
 if(count(select(launch_attack (type = critical_question_attack))=null)){grey}

 */
AA_DRK12.prototype.using_critical_questions = function(engine, db) {
    return this.distill_launch_attack_skill(engine, db, "criticalQuestions", "CRITICAL_QUESTION_ATTACK");
};


/*
 Competency: Using Backing

 IN BATTLE: completed backing

 action variable = "use_backing";
    data variable = true/false

 if(count(select(use_backing = success)>=50% total # attempts)){green}
 if(count(select(use_backing = success)<50% total # attempts)){yellow}
 if(count(select(use_backing)=null)){grey}
 */
AA_DRK12.prototype.using_backing = function(engine, db) {
return when.promise(function(resolve, reject) {

    var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Use_backing" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC';


    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.using_backing DB Error:", err);
            reject(err);
            return;
        }

        var quests = this.collate_events_by_quest(results, function(e) {

            if (e.eventName == "Use_backing" && e.eventData_key == "success") {
                return e.eventData_Value == "true";
            }

        });
        var questList = _.values(quests);

        resolve({
            "id": "usingBacking",
            "type": "skill",
            "quests": questList,
            "score": this.sum_scores(questList)
        })
    }.bind(this))

}.bind(this));
};



/*
 * callback will be called for each event that is not Quest_start/Quest_complete/Quest_cancel
 *  it should return 1/true if it was a successful attempt
 *  0/false if it was an incorrect attempt
 *  -1/undefined if it should not be considered an attempt
 *
 */
AA_DRK12.prototype.collate_events_by_quest = function(events, callback) {

    var quests = {};
    var curQuestId = undefined;
    var i;
    var unclaimedScore = {'correct': 0, 'attempts': 0};
    for (i=0; i < events.length; i++) {
        var e = events[i];
        if (e.eventName == "Quest_start" && e.eventData_Key == "questId") {
            curQuestId = e.eventData_Value;
            if (!(curQuestId in quests)) {
                quests[curQuestId] = {
                    'questId': curQuestId,
                    'score': {
                        'correct': 0,
                        'attempts': 0
                    }
                }
            }
            if (unclaimedScore.attempts) {
                quests[curQuestId].score.correct += unclaimedScore.correct;
                quests[curQuestId].score.attempts += unclaimedScore.attempts;
                unclaimedScore.correct = 0;
                unclaimedScore.attempts = 0;
            }
        }
        else if (e.eventName == "Quest_complete" || e.eventName == "Quest_cancel") {
            curQuestId = undefined;
        }
        else {
            // attempts that occur outside of a quest get attributed to the consequent quest
            var attempt = callback(e);
            var s = curQuestId ? quests[curQuestId].score : unclaimedScore;
            if (attempt != null && attempt != -1) {
                s.attempts += 1;
                s.correct += 1 ? Boolean(attempt) : 0;
            }
        }
    }
    return quests;
};


AA_DRK12.prototype.sum_scores = function(quests) {
    return quests.reduce(function(score, q) {
        return {
            'correct': score.correct + q.score.correct,
            'attempts': score.attempts + q.score.attempts
        };
    }, {
        'correct': 0,
        'attempts': 0
    });
};

AA_DRK12.prototype.distill_launch_attack_skill = function(engine, db, skillId, attack_type) {
    return when.promise(function(resolve, reject) {

        var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Launch_attack"\
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC';


        db.all(sql, function(err, results) {
            if (err) {
                console.error("AssessmentEngine: DRK12_Engine - AA_DRK12."+skillId+" DB Error:", err);
                reject(err);
                return;
            }

            var eventIdx = {};

            var quests = this.collate_events_by_quest(results, function(e) {

                if (e.eventName == "Launch_attack" && e.eventData_Key == "success") {
                    eventIdx[e.eventId] = e.eventData_Value;
                } else if (e.eventName == "Launch_attack" && e.eventData_Key == "type" && e.eventData_Value == attack_type) {
                    return eventIdx[e.eventId] == "true";
                }

            });
            var questList = _.values(quests);

            resolve({
                "id": skillId,
                "type": "skill",
                "quests": questList,
                "score": this.sum_scores(questList)
            })
        }.bind(this));

    }.bind(this));
};
