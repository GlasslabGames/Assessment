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
        "give_schemetrainingevidence",
		"Examine_object",
        "Fuse_core",
        "CoreConstruction_complete",
        "Set_up_battle",
		"Set_up_cqTrainingRound",
        "Launch_attack",
        "Use_backing",
	    "Unlock_botScheme",
        "Quest_start", "Quest_complete", "Quest_cancel",
	    "Select_bot",
        "Open_equip"
    ];
    // always include one or more keys for a give type above
    var filterEventKeys = [
        "success",              //Give_schemetrainingevidence, Use_backing, Fuse_core, Launch_attack
        "dataScheme",           //Give_schemeTrainingEvidence
        "targetScheme",         //Give_schemeTrainingEvidence
        "weakness",             //Fuse_core
        "type",                 //Launch_attack
        "questId",              //Quest_start
        "quest",                //CoreConstruction_complete
        "name",              	//Examine_object
        "botType",              //Open_equip
	    "botName",              //Open_equip
        "botEvo",               //Open_equip
        "claimId",              //Fuse_core
        "dataId",               //Fuse_core, Set_up_cqTrainingRound
        "schemeMismatch",       //Fuse_core
        "attackId",             //Launch_attack
	    "target",               //Launch_attack
        "opponentClaimId",      //Set_up_battle
	    "opponentBot1Name",     //Set_up_battle
	    "opponentBot2Name",     //Set_up_battle
	    "opponentBot3Name",     //Set_up_battle
        "opponentBot1DataId",   //Set_up_battle
	    "opponentBot2DataId",   //Set_up_battle
	    "opponentBot3DataId",   //Set_up_battle
	    "playerBot1Name",     //Set_up_battle
	    "playerBot2Name",     //Set_up_battle
	    "playerBot3Name",     //Set_up_battle
	    "playerBot1DataId",   //Set_up_battle
	    "playerBot2DataId",   //Set_up_battle
	    "playerBot3DataId",   //Set_up_battle
	    "playerBot1NumBackings",   //Set_up_battle
	    "playerBot2NumBackings",   //Set_up_battle
	    "playerBot3NumBackings",   //Set_up_battle
	    "targetCqId",           //Use_backing
        "backingId",            //Use_backing
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
            OR eventName="give_schemetrainingevidence" \
            OR eventName="Examine_object" \
            OR eventName="Fuse_core" \
            OR eventName="Select_bot" \
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

	    /* We expect to read events in any of the following sequences:
	        1.  Quest11

	        2.  Give_schemeTrainingEvidence

	        3.  Select_bot
	        	Give_schemeTrainingEvidence

			4.	Quest_start
				Examine_object
				Give_schemeTrainingEvidence

	        5.  Open_equip
	            Fuse_core
        */

        var quests = this.collate_events_by_quest(results, this.aInfo, function(e, currentQuest, currentQuestId) {
	        if (!eventIdx[e.eventId]) {
		        eventIdx[e.eventId] = {};
	        }

	        if (e.eventData_Key == "quest") {
	            // The 'quest' key is the best identifier for Quest11 eventData, but we don't want to count it for
                // events that are not the special Quest11 type (CoreConstruction_complete), so return null in all
                // other cases
		        if (e.eventName == "CoreConstruction_complete" && _disambiguate_quest_id(this.aInfo, e.eventData_Value) == "Quest11") {
		            return {
		                'correct': true,
                        'detail': ['OBSERVATRON', "CORECONSTRUCTION_COMPLETE"],
			            'attemptInfo': {
				            'botType': 'OBSERVATRON',
				            'dataId': 4974, // This dataId provided by Paula
				            'success': true
			            }
                    }
                }
	        }
	        else if (e.eventName == "Select_bot" && e.eventData_Key == "botType" && (currentQuestId == "Quest13" || currentQuestId == "Quest0-3")) {
                currentBotType = e.eventData_Value;
            }
            else if (	e.eventName == "Examine_object" && e.eventData_Key == "name" &&
						(currentQuestId == "Quest0-3" || currentQuestId == "MCreateBot" || currentQuestId == "MLevelUpBot")) {
	        	if (e.eventData_Value.substr(0, "SchemeTraining ".length) == "SchemeTraining ") {
                    currentBotType = e.eventData_Value.substr("SchemeTraining ".length).toUpperCase();
				}
            }
	        // Per slack conversation with Paula, there is a bug that causes this event name to appear in lower case sometimes.
            else if (e.eventName.toLowerCase() == "give_schemetrainingevidence") {
                if (e.eventData_Key == "dataId" || e.eventData_Key == "success") {
                    eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
                }
                else if (e.eventData_Key == "dataScheme") {
                    if (currentBotType) {
                        var correct = (e.eventData_Value == currentBotType);
                        return {
                            'correct': correct,
                            'detail': currentBotType,
                            'attemptInfo': {
                                'botType': currentBotType,
                                'dataId': eventIdx[e.eventId]['dataId'],
                                'success': correct
                            }
                        };
                    }
                }
                else if (e.eventData_Key == "targetScheme") {
                	// There are some GSTE events that lack a preceding Open_equip, Select_bot, &c. that lets us know which bot the player chose.
					// For these cases, hold out for the targetScheme key and return on that.
                	if (!currentBotType) {
                        var correct = (eventIdx[e.eventId]['success'] == "true");
                        return {
                            'correct': correct,
                            'detail': e.eventData_Value,
                            'attemptInfo': {
                                'botType': e.eventData_Value,
                                'dataId': eventIdx[e.eventId]['dataId'],
                                'success': correct
                            }
                        };
                    }
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
                    var correct = (e.eventData_Value === "false");
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
                        return ret;
                    } else {
                        /* Fuse_core that had no previous open_equip, use claimId,dataId mapping instead */
                        var ret = _lookup_fusecore_bottype(this.aInfo, fuseCoreIdx[e.eventId].claimId, fuseCoreIdx[e.eventId].dataId, currentQuestId);
                        if (ret) {
                        	ret.correct = correct;
	                        ret.attemptInfo = {
	                        	'botType': ret.detail,
		                        'dataId': fuseCoreIdx[e.eventId].dataId,
		                        'success': correct
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
		var num_bots = 3;

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
				"opponentBot1Name",
				"opponentBot2Name",
				"opponentBot3Name",
				"opponentBot1DataId",
				"opponentBot2DataId",
				"opponentBot3DataId"
			];

			var fuseCoreIdx = {};
			var eventIdx = {};

			var currentBattleEventId;
			var currentOpponentClaimCore = {};

			/* We expect to read events in any of the following sequences:
				1.  Set_up_battle
				    Launch_attack

				2.  Fuse_core
			 */

			var quests = this.collate_events_by_quest(results, this.aInfo, function(e, currentQuest, currentQuestId) {
				if (!eventIdx[e.eventId]) {
					eventIdx[e.eventId] = {};
				}

				if (e.eventName == "Set_up_battle" && setUpBattleKeys.indexOf(e.eventData_Key) >= 0) {
                    if (e.eventId != currentBattleEventId) {
                        currentBattleEventId = e.eventId;
                        currentOpponentClaimCore[currentQuestId] = {};
                    }
                    if (!currentOpponentClaimCore[currentQuestId]) {
                        currentOpponentClaimCore[currentQuestId] = {};
                    }
                    currentOpponentClaimCore[currentQuestId][e.eventData_Key] = e.eventData_Value;
				} else if (e.eventName == "Launch_attack") {
                    if (e.eventData_Key == "success") {
                        eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
                    }
					if (e.eventData_Key == "attackId" ||
						e.eventData_Key == "target") {
						eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
					}
					if (e.eventData_Key == "playerTurn") {
						eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
					}
					if (e.eventData_Key == "type" &&
						e.eventData_Value == attack_type &&
						eventIdx[e.eventId]['playerTurn']) {
						var target = eventIdx[e.eventId]['target'];
						var targetedDataIds = [];
                        var opponentClaimId;

                        if (currentOpponentClaimCore[currentQuestId]) {
                            opponentClaimId = currentOpponentClaimCore[currentQuestId]['opponentClaimId'];
                            for (var i = 1; i <= num_bots; i++) {
                                if (currentOpponentClaimCore[currentQuestId]['opponentBot' + i + 'Name'] == target) {
                                    targetedDataIds.push(currentOpponentClaimCore[currentQuestId]['opponentBot' + i + 'DataId']);
                                }
                            }
                        }

						var correct = eventIdx[e.eventId]['success'];
						if (targetedDataIds.length == 1) {
                            correct = _lookup_data_claim_attack_correctness(this.aInfo, targetedDataIds[0], opponentClaimId, eventIdx[e.eventId]['attackId']);
						}
                        //console.log(currentQuestId + " " + targetedDataId + " " + opponentClaimId + " " + eventIdx[e.eventId]['attackId'] + " " + correct);
						return {
							correct: correct,
							detail: attack_type,
							attemptInfo: {
								'attemptType': 'OFFENSE',
								'opponentClaimId': opponentClaimId,
								'opponentBotDataId': (targetedDataIds.length == 1 ? targetedDataIds[0] : null),
								'attackId': eventIdx[e.eventId]['attackId'],
								'success': correct
							}
						};
					}
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

var _lookup_data_claim_attack_correctness = function(aInfo, dataId, claimId, attackId) {
    var map = aInfo.dataClaimAttackMap;

    var strDataId = ""+dataId;
    var strClaimId = ""+claimId;

    if (strDataId in map && strClaimId in map[strDataId]) {
        return map[strDataId][strClaimId] === parseInt(attackId);
    }
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
		var num_bots = 3;

		var sql = 'SELECT * FROM events \
        WHERE \
            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
            OR eventName="Open_equip"\
            OR eventName="Select_bot"\
            OR eventName="Launch_attack"\
            OR eventName="Set_up_battle" \
            OR eventName="Set_up_cqTrainingRound" \
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

			var CQ_BOT_EVO = 2;
			var CQ_MISSION = 8;

			var eventIdx = {};

			var currentBattleEventId;
			var currentOpponentClaimCore = {};
			var currentBotTypeToEvoMap = {};
			var currentCqTrainingDataId;

			/* We expect to read events in any of the following sequences:
			    1.  Open_equip
			        Set_up_battle
				    Launch_attack
			 */

			var quests = this.collate_events_by_quest(results, this.aInfo, function(e, currentQuest, currentQuestId) {

				if (!eventIdx[e.eventId]) {
					eventIdx[e.eventId] = {};
				}
				if (e.eventName == "Set_up_battle" && setUpBattleKeys.indexOf(e.eventData_Key) >= 0) {
                    if (e.eventId != currentBattleEventId) {
                        currentBattleEventId = e.eventId;
                        currentOpponentClaimCore[currentQuestId] = {};
                    }
                    if (!currentOpponentClaimCore[currentQuestId]) {
                        currentOpponentClaimCore[currentQuestId] = {};
                    }
                    currentOpponentClaimCore[currentQuestId][e.eventData_Key] = e.eventData_Value;
                } else if (e.eventName == "Set_up_cqTrainingRound" && e.eventData_Key == "dataId") {
                	currentCqTrainingDataId = e.eventData_Value;
				} else if (e.eventName == "Open_equip" || e.eventName == "Select_bot") {
					if (!currentBotTypeToEvoMap[currentQuestId]) {
						currentBotTypeToEvoMap[currentQuestId] = {};
					}
					if (!currentBotTypeToEvoMap[currentQuestId][e.eventId]) {
						currentBotTypeToEvoMap[currentQuestId][e.eventId] = {};
					}
					currentBotTypeToEvoMap[currentQuestId][e.eventId][e.eventData_Key] = e.eventData_Value;
				}

				if (e.eventName == "Launch_attack") {
					if (e.eventData_Key == "success") {
						eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
					}
					if (e.eventData_Key == "attackId" ||
						e.eventData_Key == "target") {
						eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
					}
					if (e.eventData_Key == "playerTurn") {
						eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value == "true";
					}
					if (e.eventData_Key == "type" &&
						e.eventData_Value == attack_type &&
						eventIdx[e.eventId]['playerTurn']) {
						var CQEnabledBots = {};
						for (var botEventId in currentBotTypeToEvoMap[currentQuestId]) {
							var botInfo = currentBotTypeToEvoMap[currentQuestId][botEventId];
							CQEnabledBots[botInfo['botType']] = botInfo['botEvo'];
						}
						var detail = [];

						var botType;

						// These are the attackId -> bot type mappings given to us by Paula
						if (eventIdx[e.eventId]) {
							if (eventIdx[e.eventId]['attackId'] >= 101 &&
								eventIdx[e.eventId]['attackId'] <= 102) {
								botType = "AUTHORITRON";
								detail.push(botType);
							} else if (
								eventIdx[e.eventId]['attackId'] >= 103 &&
								eventIdx[e.eventId]['attackId'] <= 104) {
								botType = "OBSERVATRON";
								detail.push(botType);
							} else if (
								eventIdx[e.eventId]['attackId'] >= 105 &&
								eventIdx[e.eventId]['attackId'] <= 106) {
								botType = "CONSEBOT";
								detail.push(botType);
							} else if (
								eventIdx[e.eventId]['attackId'] >= 107 &&
								eventIdx[e.eventId]['attackId'] <= 108) {
								botType = "COMPARIDROID";
								detail.push(botType);
							}
						}

						var criticalQuestionsEnabled =
							CQEnabledBots[botType] >= CQ_BOT_EVO &&
							this.aInfo.quests[currentQuestId] &&
							this.aInfo.quests[currentQuestId].mission >= CQ_MISSION;
						var target = eventIdx[e.eventId]['target'];
						var targetedDataId;
						var opponentClaimId;

						if (currentOpponentClaimCore[currentQuestId]) {
							opponentClaimId = currentOpponentClaimCore[currentQuestId]['opponentClaimId'];
                            for (var i = 1; i <= num_bots; i++) {
                                if (currentOpponentClaimCore[currentQuestId]['opponentBot' + i + 'Name'] == target) {
                                    targetedDataId = currentOpponentClaimCore[currentQuestId]['opponentBot' + i + 'DataId'];
                                }
                            }
                        } else {
                            targetedDataId = currentCqTrainingDataId;
						}

						return {
							correct: eventIdx[e.eventId] && eventIdx[e.eventId]['success'],
							detail: detail,
							criticalQuestionsEnabled: criticalQuestionsEnabled,
							attemptInfo: {
								'opponentClaimId': opponentClaimId,
								'opponentBotName': target,
								'opponentBotDataId': targetedDataId,
								'attackId': eventIdx[e.eventId]['attackId'],
								'criticalQuestionsEnabled': criticalQuestionsEnabled,
								'success': eventIdx[e.eventId]['success']
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
		var attack_type = "CRITICAL_QUESTION_ATTACK";

	    var sql = 'SELECT * FROM events \
	        WHERE \
	            eventName="Quest_start" OR eventName="Quest_complete" OR eventName="Quest_cancel" \
	            OR eventName="Use_backing" \
	            OR eventName="Open_equip" \
	            OR eventName="Set_up_battle" \
	        ORDER BY \
	            serverTimeStamp ASC, gameSessionEventOrder ASC, eventData_Key ASC';


	    db.all(sql, function(err, results) {
	        if (err) {
	            console.error("AssessmentEngine: DRK12_Engine - AA_DRK12.using_backing DB Error:", err);
	            reject(err);
	            return;
	        }

	        var playerBotNames = [
		        "playerBot1Name",
		        "playerBot2Name",
		        "playerBot3Name"
	        ];

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

		    /* We expect to read events in any of the following sequences:
		        1.  Open_equip
		            Set_up_battle
			        Use_backing (repeated)
		     */

		    var currentBattleEventId;
		    var currentPlayerBotInfo = {};
		    var currentBotTypeToEvoMap = {};

		    var eventIdx = {};

		    var quests = this.collate_events_by_quest(results, this.aInfo, function(e, currentQuest, currentQuestId) {
			    if (!eventIdx[e.eventId]) {
				    eventIdx[e.eventId] = {};
			    }

			    if (e.eventName == "Open_equip") {
				    if (!currentBotTypeToEvoMap[e.eventId]) {
					    currentBotTypeToEvoMap[e.eventId] = {};
				    }

				    currentBotTypeToEvoMap[e.eventId][e.eventData_Key] = e.eventData_Value;
		        }

		        if (e.eventName == "Set_up_battle") {
			    	if (playerBotNames.indexOf(e.eventData_Key) >= 0 ||
                        playerBotDataIdKeys.indexOf(e.eventData_Key) >= 0 ||
                        playerBotNumBackingsKeys.indexOf(e.eventData_Key) >= 0) {
                        if (e.eventId != currentBattleEventId) {
                            currentBattleEventId = e.eventId;
                            currentPlayerBotInfo = {};
                        }
                        currentPlayerBotInfo[e.eventData_Key] = e.eventData_Value;
					} else if (e.eventData_Key == "quest") {
                        var botInfoMap = {};
                        for (var botEventId in currentBotTypeToEvoMap) {
                            var botInfo = currentBotTypeToEvoMap[botEventId];
                            botInfoMap[botInfo['botName']] = {
                                type: botInfo['botType'],
                                evo: botInfo['botEvo']
                            };
                        }

                        var attemptInfo = [];
                        for (var i = 1; i <= 3; i++) {
                            var playerBotPrefix = "playerBot" + i;
                            var botName;
                            if (currentPlayerBotInfo[playerBotPrefix + "Name"]) {
                                botName = currentPlayerBotInfo[playerBotPrefix + "Name"];
                                if (botInfoMap[botName] &&
                                    botInfoMap[botName].type &&
                                    botInfoMap[botName].evo >= 2) {
                                    var currentAttemptInfo = {
                                        "botType": botInfoMap[botName].type,
                                        "attemptType": "DEFENSE"
                                    };

                                    var dataId;
                                    if (currentPlayerBotInfo[playerBotPrefix + "DataId"]) {
                                        dataId = currentPlayerBotInfo[playerBotPrefix + "DataId"];
                                        currentAttemptInfo.dataId = dataId;
                                    }
                                    var numBackings;
                                    if (currentPlayerBotInfo[playerBotPrefix + "NumBackings"]) {
                                        numBackings = currentPlayerBotInfo[playerBotPrefix + "NumBackings"];
                                    }

                                    if (numBackings > 0) {
                                        currentAttemptInfo.success =
											(dataId && _lookup_usingbacking_success(this.aInfo, dataId, backingId, currentQuestId));
                                        attemptInfo.push(currentAttemptInfo);
                                    }
                                }
                            }
                        }

                        var ret = [];
                        for (var j = 0; j < attemptInfo.length; j++) {
                            ret.push({
                                correct: attemptInfo[j].success,
                                detail: "CREATED",
                                attemptInfo: attemptInfo[j]
                            });
                        }
                        return ret;
					}
		        }

			    if (e.eventName == "Use_backing" && e.eventData_Key == "playerTurn") {
				    eventIdx[e.eventId][e.eventData_Key] = (e.eventData_Value == "true");
			    }

                if (e.eventName == "Use_backing" && e.eventData_Key == "backingId") {
                    eventIdx[e.eventId][e.eventData_Key] = e.eventData_Value;
                }

			    if (e.eventName == "Use_backing" && e.eventData_Key == "targetCqId") {
				    var playerTurn = eventIdx[e.eventId]['playerTurn'];
                    var backingId = eventIdx[e.eventId]['backingId'];
				    var attackId = e.eventData_Value;

				    // Per Slack conversation with Paula, we should ignore Use_backing events with playerTurn: true
				    if (playerTurn == false) {
                        var botInfoMap = {};
                        for (var botEventId in currentBotTypeToEvoMap) {
                            var botInfo = currentBotTypeToEvoMap[botEventId];
                            botInfoMap[botInfo['botName']] = {
                                type: botInfo['botType'],
                                evo: botInfo['botEvo']
                            };
                        }

                        var attemptInfo = [];
                        for (var i = 1; i <= 3; i++) {
                            var playerBotPrefix = "playerBot" + i;
                            var botName;
                            if (currentPlayerBotInfo[playerBotPrefix + "Name"]) {
                                botName = currentPlayerBotInfo[playerBotPrefix + "Name"];
                                if (botInfoMap[botName] &&
                                    botInfoMap[botName].type &&
                                    botInfoMap[botName].evo >= 2) {
                                    var currentAttemptInfo = {
                                        "botType": botInfoMap[botName].type,
                                        "attemptType": "OFFENSE",
                                        "attackId": attackId
                                    };

                                    var dataId;
                                    if (currentPlayerBotInfo[playerBotPrefix + "DataId"]) {
                                        dataId = currentPlayerBotInfo[playerBotPrefix + "DataId"];
                                        currentAttemptInfo.dataId = dataId;
                                    }
                                    var numBackings;
                                    if (currentPlayerBotInfo[playerBotPrefix + "NumBackings"]) {
                                        numBackings = currentPlayerBotInfo[playerBotPrefix + "NumBackings"];
                                    }

                                    if (numBackings > 0) {
                                        currentAttemptInfo.backingId = backingId;
                                        currentAttemptInfo.success =
											(dataId && _lookup_usingbacking_success(this.aInfo, dataId, backingId, currentQuestId, attackId));
                                        attemptInfo.push(currentAttemptInfo);
                                    }
                                }
                            }
                        }

                        var ret = [];
                        for (var j = 0; j < attemptInfo.length; j++) {
                            ret.push({
                                correct: attemptInfo[j].success,
                                detail: "DEFENDED",
                                attemptInfo: attemptInfo[j]
                            });
                        }
                        return ret;
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

var _lookup_usingbacking_success = function(aInfo, dataId, backingId, currentQuestId, attackId) {
	var map = aInfo.useBackingDataIds;
	var backingMap = aInfo.useBackingDataIdsToBackingIdAttackIdMap;
	if (currentQuestId in map.quests) {
		// The type of the JSON array is object rather than array, so we need to do this rather than indexOf
		for (var i=0; i<map.quests[currentQuestId].length; i++) {
			if (map.quests[currentQuestId][i] == dataId) {
				if (attackId) {
                    if (backingMap[""+dataId][""+backingId] && backingMap[""+dataId][""+backingId] == attackId) {
                        return true;
                    }
                } else {
                    return true;
				}
			}
		}
	}
	return false;
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
			this.collate_events_by_quest(results, this.aInfo, function(e, currentQuest, currentQuestId) {
				if (e.eventName == "Unlock_botScheme" && e.eventData_Key == "scheme" && !unlockedBots[e.eventData_Value]) {
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


var _merge_quest_results = function(resultObjToMergeInto, resultObjToMerge) {
    if (resultObjToMerge.score.attempts) {
        resultObjToMergeInto.score.correct += resultObjToMerge.score.correct;
        resultObjToMergeInto.score.attempts += resultObjToMerge.score.attempts;
        for (var skillDetail in resultObjToMerge.detail) {
            if(!(skillDetail in resultObjToMergeInto.detail)){
                resultObjToMergeInto.detail[skillDetail] = {
                    'correct': 0,
                    'attempts': 0
                }
            }
            resultObjToMergeInto.detail[skillDetail].correct += resultObjToMerge.detail[skillDetail].correct;
            resultObjToMergeInto.detail[skillDetail].attempts += resultObjToMerge.detail[skillDetail].attempts;
        }
        resultObjToMergeInto.attemptList = resultObjToMergeInto.attemptList.concat(resultObjToMerge.attemptList);
    }
    return resultObjToMergeInto;
};

var _disambiguate_quest_id = function(aInfo, questTag) {
	// Quest titles sometimes have carriage returns in them--who knows why
	if (questTag) {
        questTag = questTag.replace("\r","").replace("\\r","");
	}

    if (aInfo.questIdDisambiguationMap) {
		if (aInfo.questIdDisambiguationMap[questTag]) {
            return aInfo.questIdDisambiguationMap[questTag];
        } else {
			return null;
		}
    }
    return questTag;
};

/*
 * callback will be called for each event that is not Quest_start/Quest_complete/Quest_cancel
 *  it should return 1/true if it was a successful attempt
 *  0/false if it was an incorrect attempt
 *  -1/undefined if it should not be considered an attempt
 *
 */
AA_DRK12.prototype.collate_events_by_quest = function(events, aInfo, callback) {

    var quests = {};
    var curQuestId = undefined;
    var curEventId = undefined;
    var i;

    var unclaimedSkills = {
        'score': {
            'correct': 0,
            'attempts': 0
        },
        'detail': {},
	    'attemptList': []
    };
    var currentUnclaimedEventBuffer = {
    	"quest": null,
        'score': {
            'correct': 0,
            'attempts': 0
        },
        'detail': {},
        'attemptList': []
	};
    for (i=0; i < events.length; i++) {
        var e = events[i];

        // DRK-420 If we've just moved on to a new event, if the last event wasn't put into a quest already, send to its
		// appropriate quest or the multi-event unclaimedSkills buffer.
		if (e.eventId != curEventId) {
			curEventId = e.eventId;

			if (currentUnclaimedEventBuffer.quest) {
				var questTargetId = currentUnclaimedEventBuffer.quest;
                if (!(questTargetId in quests)) {
                    quests[questTargetId] = {
                        'questId': questTargetId,
                        'score': {
                            'correct': 0,
                            'attempts': 0
                        },
                        'detail': {},
                        'attemptList': []
                    }
                }
                quests[questTargetId] = _merge_quest_results(quests[questTargetId], currentUnclaimedEventBuffer);
			} else {
                unclaimedSkills = _merge_quest_results(unclaimedSkills, currentUnclaimedEventBuffer);
			}

            currentUnclaimedEventBuffer = {
                "quest": null,
                'score': {
                    'correct': 0,
                    'attempts': 0
                },
                'detail': {},
                'attemptList': []
            };
		}

        if (e.eventName == "Quest_start" && e.eventData_Key == "questId") {
            // Sometimes multiple quests map to the same mission, and the simplest way to handle this is to merge
	        // them before saving attempt data.
            curQuestId = _disambiguate_quest_id(aInfo, e.eventData_Value);
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
            quests[curQuestId] = _merge_quest_results(quests[curQuestId], unclaimedSkills);
            unclaimedSkills.score.correct = 0;
            unclaimedSkills.score.attempts = 0;
            unclaimedSkills.detail = {};
            unclaimedSkills.attemptList = [];
        }
        else if (e.eventName == "Quest_complete" || e.eventName == "Quest_cancel") {
            if (e.eventData_Key == "questId") {
                // DRK-483 SPECIAL CASE for Quest23a and Quest30: a Quest_complete triggers a Skill 4.1 attempt with the specified data.
            	var specialQuestId = _disambiguate_quest_id(aInfo, e.eventData_Value);

            	var specialQuestDataId = undefined;
            	var specialQuestBotType = undefined;

                if (specialQuestId == "Quest30") {
                    specialQuestDataId = 4978;
                    specialQuestBotType = "AUTHORITRON";
                }
                if (specialQuestId == "Quest23a") {
                    specialQuestDataId = 4988;
                    specialQuestBotType = "CONSEBOT";
                }

                if (specialQuestDataId && specialQuestBotType) {
                    if (!(specialQuestId in quests)) {
                        quests[specialQuestId] = {
                            'questId': specialQuestId,
                            'score': {
                                'correct': 0,
                                'attempts': 0
                            },
                            'detail': {},
                            'attemptList': []
                        }
                    }

                    var q = quests[specialQuestId];

                    q.score.attempts += 1;
                    q.score.correct += 1;

                    var detail = "CREATED";
                    if (!(detail in q.detail)) {
                        q.detail[detail] = {
                            'correct': 0,
                            'attempts': 0
                        }
                    }
                    q.detail[detail].attempts += 1;
                    q.detail[detail].correct += 1;

                    q.attemptList.push({
                        "botType": specialQuestBotType,
                        "attemptType": "DEFENSE",
                        "success": true,
                        "dataId": specialQuestDataId
                    });
				}
            }

            curQuestId = undefined;
        }
        else {
            // attempts that occur outside of a quest get attributed to the consequent quest, or (DRK-420) to whichever
			// quest is clearly indicated by the quest tag on the event
            var q = undefined;
            if (curQuestId) {
            	q = quests[curQuestId];
			} else {
            	q = currentUnclaimedEventBuffer;

            	// DRK-420 Assign a quest to the current event if it occurred outside of a
				// Quest_start - Quest_complete/Quest_cancel window
                if (e.eventData_Key == "quest" || e.eventData_Key == "questId") {
                    currentUnclaimedEventBuffer.quest = _disambiguate_quest_id(aInfo, e.eventData_Value);
                }
            }

            var attempts = callback(e, q, curQuestId);
            var attemptsArray = Array.isArray(attempts) ? attempts  : [attempts];
            _.forEach(attemptsArray, function (attempt) {
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

					            if (typeof(attempt.criticalQuestionsEnabled) !== "undefined" && attempt.criticalQuestionsEnabled != null) {
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
            }.bind(this));
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
