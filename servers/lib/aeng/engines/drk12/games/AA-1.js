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


/*
 * callback will be called for each event that is not Quest_start/Quest_end
 *  it should return 1/true if it was a successful attempt
 *  0/false if it was an incorrect attempt
 *  -1/undefined if it should not be considered an attempt
 *
 */
var _collate_events_by_quest = function(events, callback) {

    var quests = {};
    var curQuestId = undefined;
    var i;
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
        }
        else if (e.eventName == "Quest_end") {
            curQuestId = undefined;
        }
        else {
            if (curQuestId) {
                var attempt = callback(e);
                if (attempt != null && attempt != -1) {
                    quests[curQuestId].score.attempts += 1;
                    quests[curQuestId].score.correct += 1 ? Boolean(attempt) : 0;
                }
            }
            else {
                // event happened outside of quest
            }
        }
    }
    return quests;
};


var _sum_scores = function(quests) {
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

AA_DRK12.prototype.process = function(userId, gameId, gameSessionId, eventsData) {
    var filterEventTypes = [
        "Give_schemetrainingevidence",
        "Fuse_core",
        "Battle_Select_CoreAttack",
        "Launch_attack",
        "Battle_Select_CqAttack",
        "Use_backing",
        "Quest_start"
    ];
    // always include one or more keys for a give type above
    var filterEventKeys = [
        "success",  //Give_schemetrainingevidence, Use_backing
        "weakness", //Fuse_core
        "attackId", //Battle_Select_CoreAttack, Launch_attack, Battle_Select_CqAttack
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
            eventName="Quest_start" \
            OR eventName="Give_schemetrainingevidence" \
            OR eventName="Fuse_core" \
        ORDER BY \
            serverTimeStamp DESC, gameSessionEventOrder DESC';

    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.connecting_evidence DB Error:", err);
            reject(err);
            return;
        }

        var total_attempts = results.length;
        var successful_attempts = 0;
        if (total_attempts > 0) {

            // count number of successful attempts
            successful_attempts = _.reduce(_.map(results, function(row) {
                if (row.eventName == "Fuse_core" && row.eventData_Key != "success") {
                    return 0;
                }
                return 1;
            }), function(sum,num) { return sum + num; });

        }

        resolve({
            "id": "connectingEvidence",
            "type": "skill",
            "score": {
                "correct": successful_attempts,
                "attempts": total_attempts
            }
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
    return when.promise(function(resolve, reject) {

        resolve({})

    });
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
    return when.promise(function(resolve, reject) {


        resolve({})

    });
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
            eventName="Quest_start" \
            OR eventName="Use_backing" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC';


    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.connecting_evidence DB Error:", err);
            reject(err);
            return;
        }

        var quests = _collate_events_by_quest(results, function(e) {

            if (e.eventName == "Use_backing") {
                return (e.eventData_Key == "success" && e.eventData_Value == "true");
            }

        });
        var questList = _.values(quests);

        resolve({
            "id": "usingBacking",
            "type": "skill",
            "quests": questList,
            "score": _sum_scores(questList)
        })
    }.bind(this))

}.bind(this));
};
