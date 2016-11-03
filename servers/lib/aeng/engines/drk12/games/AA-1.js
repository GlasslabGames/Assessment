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

        var quests = {};
        var curQuestId = undefined;
        var i;
        var total_attempts = 0;
        var successful_attempts = 0;
        for (i=0; i < results.length; i++) {
            var e = results[i];
            if (e.eventName == "Quest_start" && e.eventData_Key == "questId") {
                curQuestId = e.eventData_Value;
                quests[curQuestId] = {
                    'questId': curQuestId,
                    'score': {
                        'correct': 0,
                        'attempts': 0
                    }
                }
            }
            else if (e.eventName == "Use_backing") {
                if (curQuestId) {
                    quests[curQuestId].score.attempts += 1;
                    total_attempts += 1;

                    if (e.eventData_Key == "success" && e.eventData_Value == "true") {
                        quests[curQuestId].score.correct += 1;
                        successful_attempts += 1;
                    }

                } else {
                    // ! Use_backing happened outside of Quest_start!
                }
            }

        }

        resolve({
            "id": "usingBacking",
            "type": "skill",
            "quests": _.values(quests),
            "score": {
                "correct": successful_attempts,
                "attempts": total_attempts
            }
        })
    }.bind(this))

}.bind(this));
};
