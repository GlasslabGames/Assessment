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
        "Give_schemeTrainingEvidence",
        "Fuse_core",
        "CoreConstruction_complete",
        "Set_up_battle",
        "Launch_attack",
	    "Generate_backing",
        "Use_backing",
	    "Unlock_botScheme",
        "Quest_start", "Quest_complete", "Quest_cancel",
        "Open_equip"
    ];
    // always include one or more keys for a give type above
    var filterEventKeys = [
        "success",              //Give_schemetrainingevidence, Use_backing, Fuse_core, Launch_attack
        "dataScheme",           //Give_schemeTrainingEvidence
        "weakness",             //Fuse_core
        "type",                 //Launch_attack
        "questId",              //Quest_start
        "quest",                //CoreConstruction_complete
        "botType",              //Open_equip
        "botEvo",               //Open_equip
        "claimId",              //Fuse_core
        "dataId",               //Fuse_core, Generate_backing
        "schemeMismatch",       //Fuse_core
	    "numBackings",          //Generate_backing
        "attackId",             //Launch_attack
        "opponentClaimId",      //Set_up_battle
	    "opponentBot1Name",     //Set_up_battle
	    "opponentBot2Name",     //Set_up_battle
	    "opponentBot3Name",     //Set_up_battle
        "opponentBot1DataId",   //Set_up_battle
	    "opponentBot2DataId",   //Set_up_battle
	    "opponentBot3DataId",   //Set_up_battle
	    "playerTurn",           //Use_backing
	    "scheme"                //Unlock_botScheme
    ];

    return this.engine.processEventRules(userId, gameId, gameSessionId, eventsData, filterEventTypes, filterEventKeys, [
        this.connecting_evidence_argument_schemes.bind(this),
        this.supporting_claims_with_evidence.bind(this),
        this.using_critical_questions.bind(this),
        this.using_backing.bind(this),
	    this.unlock_bot.bind(this)
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
            OR eventName="Give_schemeTrainingEvidence" \
            OR eventName="Fuse_core" \
            OR eventName="CoreConstruction_complete" \
            OR eventName="Open_equip" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC, eventData_Key ASC';

    db.all(sql, function(err, results) {
        if (err) {
            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.connecting_evidence DB Error:", err);
            reject(err);
            return;
        }

        var CQ_BOT_EVO = 2;
        var CQ_MISSION = 8;

        var fuseCoreIdx = {};
        var eventIdx = {};
        var currentBotType;
	    var currentBotEvo;
        var quests = this.collate_events_by_quest(results, function(e, currentQuest, currentQuestId) {

	        if (e.eventData_Key == "quest") {
	            // The 'quest' key is the best identifier for Quest11 eventData, but we don't want to count it for
                // events that are not the special Quest11 type (CoreConstruction_complete), so return null in all
                // other cases
		        if (e.eventName == "CoreConstruction_complete" && e.eventData_Value == "Quest11") {
		            return {
		                'correct': true,
                        'detail': ['OBSERVATRON', "CORECONSTRUCTION_COMPLETE"]
                    }
                }
	        }
            else if (e.eventName == "Give_schemeTrainingEvidence") {
                if (e.eventData_Key == "dataScheme") {
                    eventIdx[e.eventId] = e.eventData_Value;
                }
                else if (e.eventData_Key == "success") {
                    var correct = (e.eventData_Key == "success" && e.eventData_Value == "true");
                    return {
                        'correct': correct,
                        'detail': eventIdx[e.eventId]
                    };
                }
            }
            else if (e.eventName == "Open_equip" && e.eventData_Key == "botType") {
                currentBotType = e.eventData_Value;
            }
            else if (e.eventName == "Open_equip" && e.eventData_Key == "botEvo") {
                currentBotEvo = e.eventData_Value;
            }
            else if (e.eventName == "Fuse_core") {
                if (e.eventData_Key == "claimId") {
                    fuseCoreIdx[e.eventId] = {
                        claimId: e.eventData_Value
                    }
                } else if (e.eventData_Key == "dataId") {
                    fuseCoreIdx[e.eventId].dataId = e.eventData_Value;
                } else if (e.eventData_Key == "schemeMismatch") {
                    var correct = e.eventData_Value == false;
                    if (currentBotType) {
                        var ret = {
                            'correct': correct,
                            'detail': [currentBotType, "FUSE_CORE"],
	                        'criticalQuestionsEnabled':
	                            currentBotEvo >= CQ_BOT_EVO &&
	                            this.aInfo.quests[currentQuestId] &&
	                            this.aInfo.quests[currentQuestId].mission >= CQ_MISSION,
	                        'attemptInfo': {
                                'botType': currentBotType,
		                        'dataId': fuseCoreIdx[e.eventId].dataId,
                                'success': correct
	                        }
                        };
                        currentBotType = undefined;
	                    currentBotEvo = undefined;
                        return ret
                    } else {
                        /* Fuse_core that had no previous open_equip, use claimId,dataId mapping instead */
                        var ret = _lookup_fusecore_bottype(this.aInfo, fuseCoreIdx[e.eventId].claimId, fuseCoreIdx[e.eventId].dataId, currentQuestId);
                        if (ret) {
	                        ret.attemptInfo = {
	                        	'botType': ret.detail,
		                        'dataId': fuseCoreIdx[e.eventId].dataId,
		                        'success': ret.correct
	                        };
                        }
                        return ret;
                    }
                }
            }

        }.bind(this));
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

var _lookup_fusecore_bottype = function(aInfo, claimId, dataId, currentQuestId) {
    var map = aInfo.fuseCoreMapping;

    if (currentQuestId in map.quests) {
        // map based on dataId only
        if (dataId in map.quests[currentQuestId]) {
            return map.quests[currentQuestId][dataId];
        }
    }

    // map on both claimId and dataId
    if (claimId in map['claimIds'] && dataId in map['claimIds'][claimId]) {
        return map['claimIds'][claimId][dataId];
    }
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
		var skillId = "supportingClaims";
		var attack_type = "CORE_ATTACK";

		var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Launch_attack"\
            OR eventName="Set_up_battle" \
            OR eventName="Fuse_core" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC, eventName ASC, eventData_Key ASC';


		db.all(sql, function(err, results) {
			if (err) {
				console.error("AssessmentEngine: DRK12_Engine - AA_DRK12."+skillId+" DB Error:", err);
				reject(err);
				return;
			}

			var setUpBattleKeys = [
				"opponentClaimId",
				"opponentBot1DataId",
				"opponentBot2DataId",
				"opponentBot3DataId"
			];

			var fuseCoreIdx = {};
			var eventIdx = {};

			var quests = this.collate_events_by_quest(results, function(e) {

				if (!eventIdx[e.eventId]) {
					eventIdx[e.eventId] = {'attemptType': 'OFFENSE'};
				}

				if (e.eventName == "Set_up_battle" && setUpBattleKeys.indexOf(e.eventData_Key) >= 0) {
					eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
				} else if (e.eventName == "Launch_attack" && e.eventData_Key == "success") {
					eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
				} else if (e.eventName == "Launch_attack" && e.eventData_Key == "attackId") {
					eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
				} else if (e.eventName == "Launch_attack" && e.eventData_Key == "type" && e.eventData_Value == attack_type) {
					return {
						correct: eventIdx[e.eventId]['success'] == "true",
						detail: attack_type,
                        attemptInfo: eventIdx[e.eventId]
					};
				}

				if (e.eventName == "Fuse_core") {
					if (e.eventData_Key == "claimId") {
						fuseCoreIdx[e.eventId] = {
							claimId: e.eventData_Value
						}
					} else if (e.eventData_Key == "dataId") {
						fuseCoreIdx[e.eventId].dataId = e.eventData_Value;
					} else if (e.eventData_Key == "weakness") {
						var correct = e.eventData_Value == "none";
						return {
							'correct': correct,
							'detail': ["FUSE_CORE"],
							'attemptInfo': {
								'attemptType': 'DEFENSE',
								'claimId': fuseCoreIdx[e.eventId].claimId,
								'dataId': fuseCoreIdx[e.eventId].dataId,
								'success': correct
							}
						};
					}
				}

			}.bind(this));
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
		var skillId = "criticalQuestions";
		var attack_type = "CRITICAL_QUESTION_ATTACK";

		var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Launch_attack"\
            OR eventName="Set_up_battle" \
        ORDER BY \
            serverTimeStamp ASC, gameSessionEventOrder ASC, eventName ASC, eventData_Key ASC';


		db.all(sql, function(err, results) {
			if (err) {
				console.error("AssessmentEngine: DRK12_Engine - AA_DRK12."+skillId+" DB Error:", err);
				reject(err);
				return;
			}

			var setUpBattleKeys = [
			    "opponentClaimId",
                "opponentBot1Name",
                "opponentBot2Name",
                "opponentBot3Name",
                "opponentBot1DataId",
                "opponentBot2DataId",
                "opponentBot3DataId"
            ];

			var eventIdx = {};

			var quests = this.collate_events_by_quest(results, function(e) {

				if (!eventIdx[e.eventId]) {
					eventIdx[e.eventId] = {};
				}

				if (e.eventName == "Set_up_battle" && setUpBattleKeys.indexOf(e.eventData_Key) >= 0) {
					eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
				}

				// TODO: add 'does player have access to matching CQ's? (see spec)

				if (e.eventName == "Launch_attack" && e.eventData_Key == "success") {
					eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
				} else if (e.eventName == "Launch_attack" && e.eventData_Key == "attackId") {
                    eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
				} else if (e.eventName == "Launch_attack" && e.eventData_Key == "type" && e.eventData_Value == attack_type) {

				    var detail = [];

				    // These are the attackId -> bot type mappings given to us by Paula
					if (eventIdx[e.eventId]) {
					    if (eventIdx[e.eventId]['attackId'] >= 101 &&
                            eventIdx[e.eventId]['attackId'] <= 102) {
						    detail.push("AUTHORITRON");
                        } else if (
                            eventIdx[e.eventId]['attackId'] >= 103 &&
                            eventIdx[e.eventId]['attackId'] <= 104) {
							detail.push("OBSERVATRON");
						} else if (
						    eventIdx[e.eventId]['attackId'] >= 105 &&
                            eventIdx[e.eventId]['attackId'] <= 106) {
							detail.push("CONSEBOT");
						} else if (
						    eventIdx[e.eventId]['attackId'] >= 107 &&
                            eventIdx[e.eventId]['attackId'] <= 108) {
							detail.push("COMPARIDROID");
						}
                    }

					return {
						correct: eventIdx[e.eventId] && eventIdx[e.eventId]['success'],
						detail: detail,
                        attemptInfo: eventIdx[e.eventId]
					};
				}

			}.bind(this));
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
	            OR eventName="Generate_backing" \
	            OR eventName="Use_backing" \
	            OR eventName="Open_equip" \
	            OR eventName="Set_up_battle" \
	            OR eventName="Launch_attack"\
	        ORDER BY \
	            serverTimeStamp ASC, gameSessionEventOrder ASC, eventData_Key ASC';


	    db.all(sql, function(err, results) {
	        if (err) {
	            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.using_backing DB Error:", err);
	            reject(err);
	            return;
	        }

		    var playerBotDataIdKeys = [
			    "playerBot1DataId",
			    "playerBot2DataId",
			    "playerBot3DataId"
		    ];

		    var playerBotNumBackingsKeys = [
			    "playerBot1NumBackings",
			    "playerBot2NumBackings",
			    "playerBot3NumBackings"
		    ];

	        var eventIdx = {};
		    var quests = this.collate_events_by_quest(results, function(e, currentQuest, currentQuestId) {

		        if (!eventIdx[e.eventId]) {
			        eventIdx[e.eventId] = {};
		        }

		        if (e.eventName == "Open_equip" && e.eventData_Key == "botType") {
			        eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
		        }

			    if (e.eventName == "Launch_attack" && e.eventData_Key == "attackId") {
				    eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
			    }

		        if (e.eventName == "Set_up_battle" &&
			        (playerBotDataIdKeys.indexOf(e.eventData_Key) >= 0 ||
			        playerBotNumBackingsKeys.indexOf(e.eventData_Key) >= 0)
		        ) {
			        eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
		        }

			    if (e.eventName == "Generate_backing" && (e.eventData_Key == "dataId" || e.eventData_Key == "numBackings")) {
				    eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
			    }

	            if (e.eventName == "Use_backing" && e.eventData_Key == "playerTurn") {
		            eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
		            var playerTurn = eventIdx[e.eventId]["playerTurn"] == "true";

		        	var success = true;
		        	var dataId = eventIdx[e.eventId]["dataId"];
		        	var numBackings = eventIdx[e.eventId]["numBackings"];
		        	if (!dataId) {
				        for (playerBotDataIdKey in playerBotDataIdKeys) {
					        success = success && _lookup_usingbacking_success(this.aInfo, eventIdx[e.eventId][playerBotDataIdKey], currentQuestId);
					        dataId = eventIdx[e.eventId][playerBotDataIdKey];
				        }
			            for (playerBotNumBackingsKey in playerBotNumBackingsKeys) {
				            success = success && (eventIdx[e.eventId][playerBotNumBackingsKey] > 0);
			            }
		            } else {
		        		success = _lookup_usingbacking_success(this.aInfo, dataId, currentQuestId) && numBackings > 0;
			        }

		            if (playerTurn) {
			            return {
				            correct: success,
				            detail: "CREATED",
				            attemptInfo: {
					            botType: eventIdx[e.eventId]["botType"],
					            dataId: dataId,
					            success: success,
					            attemptType: "DEFENSE"
				            }
			            };
		            } else {
			            return {
				            correct: success,
				            detail: "DEFENDED",
				            attemptInfo: {
					            attackId: eventIdx[e.eventId]["attackId"],
					            dataId: dataId,
					            success: success,
					            attemptType: "OFFENSE"
				            }
			            };
		            }
	            }

		    }.bind(this));
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

var _lookup_usingbacking_success = function(aInfo, dataId, currentQuestId) {
	var map = aInfo.useBackingDataIds;
	return (currentQuestId in map.quests) && (dataId in map.quests[currentQuestId]);
};


/*
 Events: Unlock Bot Scheme
 */
AA_DRK12.prototype.unlock_bot = function(engine, db) {
	return when.promise(function(resolve, reject) {

		var sql = 'SELECT * FROM events \
	        WHERE \
	            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
	            OR eventName="Unlock_botScheme" \
	        ORDER BY \
	            serverTimeStamp ASC, gameSessionEventOrder ASC, eventData_Key ASC';


		db.all(sql, function(err, results) {
			if (err) {
				console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.unlock_bot DB Error:", err);
				reject(err);
				return;
			}

			var unlockedBots = {};
			this.collate_events_by_quest(results, function(e, currentQuest, currentQuestId) {
				if (e.eventName == "Unlock_botScheme" && e.eventData_Key == "scheme") {
					unlockedBots[e.eventData_Value] = currentQuestId;
				}
			}.bind(this));

			resolve({
				"id": "argubotsUnlocked",
				"type": "skill",
				"bots": unlockedBots
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
    // var unclaimedScore = {'correct': 0, 'attempts': 0};
    var unclaimedSkills = {
        'score': {
            'correct': 0,
            'attempts': 0
        },
        'detail': {},
	    'attemptList': []
    };
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
                    },
                    'detail': {},
                    'attemptList': []
                }
            }
            if (unclaimedSkills.score.attempts) {
                quests[curQuestId].score.correct += unclaimedSkills.score.correct;
                quests[curQuestId].score.attempts += unclaimedSkills.score.attempts;
                quests[curQuestId].detail = _.clone(unclaimedSkills.detail);
                quests[curQuestId].attemptList = quests[curQuestId].attemptList.concat(unclaimedSkills.attemptList);
                unclaimedSkills.score.correct = 0;
                unclaimedSkills.score.attempts = 0;
                unclaimedSkills.detail = {};
                unclaimedSkills.attemptList = [];
            }
        }
        else if (e.eventName == "Quest_complete" || e.eventName == "Quest_cancel") {
            curQuestId = undefined;
        }
        else {
            // attempts that occur outside of a quest get attributed to the consequent quest
            var q = curQuestId ? quests[curQuestId] : unclaimedSkills;

            var attempt = callback(e, q, curQuestId);
            if (attempt != null && attempt != -1) {
                q.score.attempts += 1;
                if (typeof attempt === 'object' && 'correct' in attempt) {
                    var is_correct = Boolean(attempt.correct);
                    is_correct ? q.score.correct += 1 : 0;
                    if (attempt.detail) {
                        var details = Array.isArray(attempt.detail) ? attempt.detail  : [attempt.detail];
                        _.forEach(details, function(detail) {
                            if (!(detail in q.detail)) {
                                q.detail[detail] = {
                                    'correct': 0,
                                    'attempts': 0
                                }
                            }
                            q.detail[detail].attempts += 1;
                            is_correct ? q.detail[detail].correct += 1 : 0;

                            if (attempt.criticalQuestionsEnabled) {
                            	q.detail[detail]['criticalQuestionsEnabled'] = attempt.criticalQuestionsEnabled;
                            }
                        }.bind(this));
                    }
                    if (attempt.attemptInfo) {
                        q.attemptList.push(attempt.attemptInfo);
                    }
                } else {
                    Boolean(attempt) ? q.score.correct += 1 : 0;
                }
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
