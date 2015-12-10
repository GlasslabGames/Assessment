var _ = require('lodash');

module.exports = WWF_Distiller;

function WWF_Distiller() {
}

// ENUMS
var STATUS = Object.freeze({
    NOT_STARTED: "Not-Started",
    IN_PROGRESS: "In-Progress",
    PARTIAL: "Partial",
    FULL: "Full",
    WATCH_OUT: "Watchout"
});

var STANDARD = Object.freeze({
    L66: "L.6.6",
    L76: "L.7.6",
    L86: "L.8.6",
    L44A: "L.4.4.A",
    L54C: "L.5.4.C",
    L64A: "L.6.4.A",
    L74A: "L.7.4.A",
    L84A: "L.8.4.A"
});

/**
 * Reports defined in spreadsheet:
 * https://docs.google.com/spreadsheets/d/1hMtsYrMRl3acHJ8LNdzT6h31hXVE-ICI4RaH37vv-Zg/edit#gid=1635638294
 */

WWF_Distiller.prototype.preProcess = function (sessionsEvents, currentResults) {
    // Process data through distiller function
    console.log("Starting preProcess");

    var results = currentResults.results;

    // data structure which will replace the current results object
    // merges in current reports statuses or sets defaults if no report present
    var reportCard = _buildReportCardData(results);

    var action, data, eventOrder, timestamp, current_gameID;

    var games = reportCard["games"];
    var AWIC = reportCard["AWIC"];

    _(sessionsEvents).forEach(function (session) {
        //console.log(session.gameSessionId);
        _(session.events).forEach(function (event) {
            timestamp = event.serverTimeStamp;
            eventOrder = event.gameSessionEventOrder;
            action = event.eventName;
            data = event.eventData;
            current_gameID = data.current_gameID;

            if (!current_gameID || current_gameID === "(no game)") {
                return;
            }

            // Group number_academic_words_played by gameId for L.6.6, L.7.6, L.8.6
            if (action === "TurnEnd") {
                if (!games[current_gameID]) {
                    games[current_gameID] = {};
                }
                if (_.has(data, "number_academic_words_played") && _.has(data, "Action_order_within_game")) {
                    games[current_gameID][data.Action_order_within_game] = data.number_academic_words_played;
                }
            }

            // Track AWIC for L.4.4.A etc.
            if (action === "AWIC" && _.has(data, "AWIC_status")) {
                AWIC.total++;
                if (data["AWIC_status"] === "success") {
                    AWIC.success++;
                }

                var AWIC_percentage = 100 * AWIC.success / AWIC.total;

                if (reportCard[STANDARD.L44A].status === STATUS.NOT_STARTED) {
                    reportCard[STANDARD.L44A].status = STATUS.IN_PROGRESS;
                }
                if (reportCard[STANDARD.L54C].status === STATUS.NOT_STARTED) {
                    reportCard[STANDARD.L54C].status = STATUS.IN_PROGRESS;
                }
                if (reportCard[STANDARD.L64A].status === STATUS.NOT_STARTED) {
                    reportCard[STANDARD.L64A].status = STATUS.IN_PROGRESS;
                }
                if (reportCard[STANDARD.L74A].status === STATUS.NOT_STARTED) {
                    reportCard[STANDARD.L74A].status = STATUS.IN_PROGRESS;
                }
                if (reportCard[STANDARD.L84A].status === STATUS.NOT_STARTED) {
                    reportCard[STANDARD.L84A].status = STATUS.IN_PROGRESS;
                }

                if (reportCard[STANDARD.L44A].status !== STATUS.FULL) {
                    if (AWIC.total >= 20 && AWIC.success === 0) {
                        reportCard[STANDARD.L44A].status = STATUS.WATCH_OUT;
                    }
                    if (AWIC.total >= 4 && AWIC_percentage >= 25) {
                        reportCard[STANDARD.L44A].status = STATUS.PARTIAL;
                    }
                    if (AWIC.total >= 6 && AWIC_percentage >= 50) {
                        reportCard[STANDARD.L44A].status = STATUS.FULL;
                    }
                }
                if (reportCard[STANDARD.L54C].status !== STATUS.FULL) {
                    if (AWIC.total >= 20 && AWIC_percentage <= 5) {
                        reportCard[STANDARD.L54C].status = STATUS.WATCH_OUT;
                    }
                    if (AWIC.total >= 6 && AWIC_percentage >= 33) {
                        reportCard[STANDARD.L54C].status = STATUS.PARTIAL;
                    }
                    if (AWIC.total >= 9 && AWIC_percentage >= 55) {
                        reportCard[STANDARD.L54C].status = STATUS.FULL;
                    }
                }
                if (reportCard[STANDARD.L64A].status !== STATUS.FULL) {
                    if (AWIC.total >= 20 && AWIC_percentage <= 10) {
                        reportCard[STANDARD.L64A].status = STATUS.WATCH_OUT;
                    }
                    if (AWIC.total >= 8 && AWIC_percentage >= 37) {
                        reportCard[STANDARD.L64A].status = STATUS.PARTIAL;
                    }
                    if (AWIC.total >= 10 && AWIC_percentage >= 60) {
                        reportCard[STANDARD.L64A].status = STATUS.FULL;
                    }
                }
                if (reportCard[STANDARD.L74A].status !== STATUS.FULL) {
                    if (AWIC.total >= 20 && AWIC_percentage <= 15) {
                        reportCard[STANDARD.L74A].status = STATUS.WATCH_OUT;
                    }
                    if (AWIC.total >= 9 && AWIC_percentage >= 44) {
                        reportCard[STANDARD.L74A].status = STATUS.PARTIAL;
                    }
                    if (AWIC.total >= 11 && AWIC_percentage >= 63) {
                        reportCard[STANDARD.L74A].status = STATUS.FULL;
                    }
                }
                if (reportCard[STANDARD.L84A].status !== STATUS.FULL) {
                    if (AWIC.total >= 20 && AWIC_percentage <= 20) {
                        reportCard[STANDARD.L84A].status = STATUS.WATCH_OUT;
                    }
                    if (AWIC.total >= 11 && AWIC_percentage >= 45) {
                        reportCard[STANDARD.L84A].status = STATUS.PARTIAL;
                    }
                    if (AWIC.total >= 13 && AWIC_percentage >= 69) {
                        reportCard[STANDARD.L84A].status = STATUS.FULL;
                    }
                }
            }
        });
    });

    return reportCard;
};


WWF_Distiller.prototype.postProcess = function (standardsData) {
    // L.6.6, L.7.6, L.8.6
    if (standardsData && standardsData.games) {

        var numGamesStarted = Object.keys(standardsData.games).length;
        var prevSum = [0, 0];

        if (standardsData[STANDARD.L66].status === STATUS.NOT_STARTED) {
            standardsData[STANDARD.L66].status = STATUS.IN_PROGRESS;
        }
        if (standardsData[STANDARD.L76].status === STATUS.NOT_STARTED && numGamesStarted >= 2) {
            standardsData[STANDARD.L76].status = STATUS.IN_PROGRESS;
        }
        if (standardsData[STANDARD.L86].status === STATUS.NOT_STARTED && numGamesStarted >= 3) {
            standardsData[STANDARD.L86].status = STATUS.IN_PROGRESS;
        }

        for (var gameId in standardsData.games) {
            var turns = [];
            var sum;
            var joinedTurns;

            // turns is an array while standardsData.games[gameId] is an object
            // we're doing the obj to array conversion as the order matters
            for (var actionOrder in standardsData.games[gameId]) {
                turns[actionOrder] = standardsData.games[gameId][actionOrder];
            }

            // remove the gaps in the array
            turns = turns.filter(function (n) {
                return _.isNumber(n);
            });

            sum = turns.reduce(function (sum, n) {
                return sum + n;
            }, 0);

            // join into string to make pattern matching easy
            joinedTurns = turns.join("");

            //console.log(gameId, sum, joinedTurns);

            if (joinedTurns.match(/0{15,}/) && standardsData[STANDARD.L66].status !== STATUS.FULL) {
                standardsData[STANDARD.L66].status = STATUS.WATCH_OUT;
            }
            if (sum >= 3 && (standardsData[STANDARD.L66].status === STATUS.IN_PROGRESS
                || standardsData[STANDARD.L66].status === STATUS.WATCH_OUT)) {

                standardsData[STANDARD.L66].status = STATUS.PARTIAL;
            }
            if (sum >= 5 && standardsData[STANDARD.L66].status !== STATUS.FULL) {
                standardsData[STANDARD.L66].status = STATUS.FULL;
            }

            if (joinedTurns.match(/0{12,}/) && standardsData[STANDARD.L76].status !== STATUS.FULL) {
                standardsData[STANDARD.L76].status = STATUS.WATCH_OUT;
            }
            if (sum + prevSum[0] >= 8 && (standardsData[STANDARD.L76].status === STATUS.IN_PROGRESS
                || standardsData[STANDARD.L76].status === STATUS.WATCH_OUT)) {

                standardsData[STANDARD.L76].status = STATUS.PARTIAL;
            }
            if (sum + prevSum[0] >= 14 && standardsData[STANDARD.L76].status !== STATUS.FULL) {
                standardsData[STANDARD.L76].status = STATUS.FULL;
            }

            if (joinedTurns.match(/0{9,}/) && standardsData[STANDARD.L86].status !== STATUS.FULL) {
                standardsData[STANDARD.L86].status = STATUS.WATCH_OUT;
            }
            if (sum + prevSum[0] + prevSum[1] >= 15 && (standardsData[STANDARD.L86].status === STATUS.IN_PROGRESS
                || standardsData[STANDARD.L86].status === STATUS.WATCH_OUT)) {

                standardsData[STANDARD.L86].status = STATUS.PARTIAL;
            }
            if (sum + prevSum[0] + prevSum[1] >= 27 && standardsData[STANDARD.L86].status !== STATUS.FULL) {
                standardsData[STANDARD.L86].status = STATUS.FULL;
            }

            prevSum[1] = prevSum[0]
            prevSum[0] = sum;
        }
    }

    return standardsData;
};


function _buildReportCardData(results) {
    var reportCard = {};
    if (_.isEmpty(results)) {
        reportCard[STANDARD.L66] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L76] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L86] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L44A] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L54C] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L64A] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L74A] = {status: STATUS.NOT_STARTED};
        reportCard[STANDARD.L84A] = {status: STATUS.NOT_STARTED};
        reportCard["games"] = {};
        reportCard["AWIC"] = {success: 0, total: 0};
    } else {
        _.merge(reportCard, results);
    }

    return reportCard;
}