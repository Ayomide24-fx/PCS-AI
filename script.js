// =====================================================
// PCS AI BACKEND CONNECTION
// =====================================================

const PCS_BACKEND =
    "https://pcs-ai-backend.onrender.com";


// =====================================================
// BACKEND HEALTH CHECK
// =====================================================

async function checkBackend() {

    try {

        const response =
            await fetch(
                PCS_BACKEND + "/api/health"
            );

        if (!response.ok) {
            throw new Error("Backend unavailable");
        }

        const data =
            await response.json();

        console.log(
            "PCS AI Backend:",
            data
        );


        // Update system status

        const systemRows =
            document.querySelectorAll(
                ".system-row"
            );


        if (systemRows.length >= 5) {

            systemRows[0]
                .querySelector("strong")
                .innerHTML = "ONLINE";

            systemRows[0]
                .querySelector("strong")
                .className = "ready";


            systemRows[1]
                .querySelector("strong")
                .innerHTML =
                    data.tradingView === "pending"
                        ? "PENDING"
                        : "ONLINE";


            systemRows[2]
                .querySelector("strong")
                .innerHTML =
                    data.mt5 === "pending"
                        ? "PENDING"
                        : "ONLINE";

        }


        console.log(
            "PCS AI backend connection successful."
        );

    }

    catch (error) {

        console.error(
            "PCS AI backend connection failed:",
            error
        );

    }

}


// =====================================================
// GET MARKET DATA
// =====================================================

async function getMarketData(
    symbol,
    timeframe
) {

    try {

        const url =
            PCS_BACKEND +
            "/api/market?symbol=" +
            encodeURIComponent(symbol) +
            "&timeframe=" +
            encodeURIComponent(timeframe);


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Market request failed"
            );

        }


        const data =
            await response.json();


        console.log(
            "Market data:",
            data
        );


        return data;

    }

    catch (error) {

        console.error(
            "Market data error:",
            error
        );

        return null;

    }

}

// =====================================================
// PCS AI RISK CHECK + NOTIFICATION CONNECTION
// =====================================================

async function checkPCSRisk(tradeData) {

    try {

        const response =
            await fetch(
                PCS_BACKEND + "/api/risk/check",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            tradeData
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                "Risk check request failed"
            );

        }


        const result =
            await response.json();


        console.log(
            "PCS AI Risk Check:",
            result
        );


        // -------------------------------------------------
        // TRADE APPROVED
        // -------------------------------------------------

        if (result.approved === true) {

            console.log(
                "🟢 PCS AI TRADE APPROVED"
            );

            return result;

        }


        // -------------------------------------------------
        // TRADE BLOCKED
        // -------------------------------------------------

        console.warn(
            "🔴 PCS AI TRADE BLOCKED:",
            result.reason
        );


        return result;

    }

    catch (error) {

        console.error(
            "PCS AI risk connection error:",
            error
        );


        return {

            approved: false,

            reason:
                "Unable to contact PCS AI risk engine."

        };

    }

}
// =====================================================
// UPDATE MARKET DATA
// =====================================================

async function updateRealMarketData() {

    const market =
        document.getElementById("market").value;


    const timeframe =
        document.getElementById("timeframe").value;


    const price =
        document.getElementById(
            "currentPrice"
        );


    const status =
        document.getElementById(
            "priceStatus"
        );


    status.innerHTML =
        "● CONNECTING TO PCS AI BACKEND";


    const data =
        await getMarketData(
            market,
            timeframe
        );


    if (!data) {

        price.innerHTML =
            "DATA ERROR";

        status.innerHTML =
            "● BACKEND CONNECTION ERROR";

        return;

    }


    if (data.price === null) {

        price.innerHTML =
            "WAITING FOR PRICE";

        status.innerHTML =
            "● BACKEND ONLINE • MARKET DATA PENDING";

        return;

    }


    price.innerHTML =
        data.price;


    status.innerHTML =
        "● LIVE • " +
        data.symbol +
        " • " +
        data.timeframe;

}


// =====================================================
// MARKET / TIMEFRAME CHANGE
// =====================================================

document
    .getElementById("market")
    .addEventListener(
        "change",
        updateRealMarketData
    );


document
    .getElementById("timeframe")
    .addEventListener(
        "change",
        updateRealMarketData
    );


// =====================================================
// INITIALIZE BACKEND
// =====================================================

window.addEventListener(
    "load",
    function () {

        checkBackend();

        updateRealMarketData();

    }
);
// =====================================================
// PCS AI MASTER
// PHASE 1 DASHBOARD ENGINE
// =====================================================


// =====================================================
// GLOBAL STATE
// =====================================================

var selectedMarket = "XAUUSD";
var selectedTimeframe = "5m";

var tradingMode = "standard";
var environment = "demo";

var tradeHistory = [];

var openPositions = [];


// =====================================================
// MARKET SELECTOR
// =====================================================

document.getElementById("market").addEventListener(
    "change",
    function () {

        selectedMarket = this.value;

        updateMarketDisplay();

    }
);


// =====================================================
// TIMEFRAME SELECTOR
// =====================================================

document.getElementById("timeframe").addEventListener(
    "change",
    function () {

        selectedTimeframe = this.value;

        updateMarketDisplay();

    }
);


// =====================================================
// TRADING MODE
// =====================================================

document.getElementById("tradingMode").addEventListener(
    "change",
    function () {

        tradingMode = this.value;

        updateTradingMode();

    }
);


// =====================================================
// DEMO / LIVE SWITCH
// =====================================================

document.getElementById("environment").onclick =
    function () {

        if (environment === "demo") {

            environment = "live";

            this.innerHTML = "🔴 LIVE";
            this.className = "environment live";

        } else {

            environment = "demo";

            this.innerHTML = "🧪 DEMO";
            this.className = "environment demo";

        }

        console.log(
            "Trading environment:",
            environment
        );
    };


// =====================================================
// MARKET DISPLAY
// =====================================================

function updateMarketDisplay() {

    document.getElementById("priceStatus").innerHTML =
        "● " +
        selectedMarket +
        " • " +
        selectedTimeframe +
        " • DATA CONNECTION PENDING";

}


// =====================================================
// TRADING MODE ENGINE
// =====================================================

function updateTradingMode() {

    var info =
        document.getElementById("modeInfo");

    var limit =
        document.getElementById("positionLimit");


    if (tradingMode === "standard") {

        info.innerHTML =
            "Standard mode: maximum 3 open positions per selected pair.";

        limit.innerHTML =
            "3 / PAIR";

    }

    else if (tradingMode === "scalper") {

        info.innerHTML =
            "Scalper mode: multiple positions allowed, with tighter risk controls.";

        limit.innerHTML =
            "MULTIPLE";

    }

    else if (tradingMode === "mode3") {

        info.innerHTML =
            "Advanced mode: PCS AI will use advanced market-selection rules.";

        limit.innerHTML =
            "AI CONTROLLED";

    }

    else {

        info.innerHTML =
            "Custom mode: advanced settings will be configured later.";

        limit.innerHTML =
            "CUSTOM";

    }

}


// =====================================================
// PCS ANALYSIS
// =====================================================

document.getElementById("analyze").onclick =
    function () {


        var trend =
            document.getElementById("trend").value;


        var pcs =
            document.getElementById("pcs").value;


        var heiken =
            document.getElementById("heiken").value;


        var support =
            document.getElementById("support").value;


        var balance =
            Number(
                document.getElementById("balance").value
            );


        var risk =
            Number(
                document.getElementById("risk").value
            );


        var entry =
            Number(
                document.getElementById("entry").value
            );


        var stop =
            Number(
                document.getElementById("stop").value
            );


        var takeProfit =
            Number(
                document.getElementById("takeProfit").value
            );


        var value =
            Number(
                document.getElementById("value").value
            );


        if (
            balance <= 0 ||
            risk <= 0 ||
            entry <= 0 ||
            stop <= 0 ||
            takeProfit <= 0 ||
            value <= 0
        ) {

            alert(
                "Please complete all trade fields."
            );

            return;
        }


        var riskAmount =
            balance * risk / 100;


        var stopDistance =
            Math.abs(entry - stop);


        var rewardDistance =
            Math.abs(takeProfit - entry);


        if (stopDistance === 0) {

            alert(
                "Entry and Stop Loss cannot be the same."
            );

            return;
        }


        if (rewardDistance === 0) {

            alert(
                "Entry and Take Profit cannot be the same."
            );

            return;
        }


        var positionSize =
            riskAmount /
            (stopDistance * value);


        var riskReward =
            rewardDistance /
            stopDistance;


        document.getElementById(
            "riskResult"
        ).innerHTML =
            "$" +
            riskAmount.toFixed(2);


        document.getElementById(
            "distanceResult"
        ).innerHTML =
            stopDistance.toFixed(2);


        document.getElementById(
            "positionResult"
        ).innerHTML =
            positionSize.toFixed(4);


        document.getElementById(
            "rewardResult"
        ).innerHTML =
            rewardDistance.toFixed(2);


        document.getElementById(
            "rrResult"
        ).innerHTML =
            "1:" +
            riskReward.toFixed(2);


        var riskLevel =
            document.getElementById(
                "riskLevel"
            );


        if (risk <= 2) {

            riskLevel.innerHTML =
                "LOW";

            riskLevel.style.color =
                "#00ff88";

        }

        else if (risk <= 5) {

            riskLevel.innerHTML =
                "MEDIUM";

            riskLevel.style.color =
                "#ffd166";

        }

        else {

            riskLevel.innerHTML =
                "HIGH";

            riskLevel.style.color =
                "#ff4d6d";

        }


        // =================================================
        // CONFIDENCE
        // =================================================

        var confidence = 0;


        if (trend === "bullish" ||
            trend === "bearish") {

            confidence += 20;

        }


        if (pcs === "yes") {

            confidence += 20;

        }


        if (heiken === "yes") {

            confidence += 20;

        }


        if (support === "yes") {

            confidence += 20;

        }


        if (riskReward >= 2) {

            confidence += 20;

        }


        document.getElementById(
            "confidenceValue"
        ).innerHTML =
            confidence +
            "%";


        document.getElementById(
            "confidenceFill"
        ).style.width =
            confidence +
            "%";


        var confidenceStatus =
            document.getElementById(
                "confidenceStatus"
            );


        if (confidence >= 100) {

            confidenceStatus.innerHTML =
                "🟢 VERY STRONG";

        }

        else if (confidence >= 80) {

            confidenceStatus.innerHTML =
                "🟢 STRONG";

        }

        else if (confidence >= 60) {

            confidenceStatus.innerHTML =
                "🟡 MODERATE";

        }

        else if (confidence >= 40) {

            confidenceStatus.innerHTML =
                "🟠 WEAK";

        }

        else {

            confidenceStatus.innerHTML =
                "🔴 VERY WEAK";

        }


        // =================================================
        // SIGNAL
        // =================================================

        var signal =
            document.getElementById(
                "signal"
            );


        var reason =
            document.getElementById(
                "reason"
            );


        if (risk > 5) {

            signal.innerHTML =
                "🟡 WAIT";

            signal.style.color =
                "#ffd166";

            reason.innerHTML =
                "Risk above 5%. Trade rejected.";

            return;

        }


        if (
            trend === "bullish" &&
            pcs === "yes" &&
            heiken === "yes" &&
            support === "yes" &&
            riskReward >= 2
        ) {

            signal.innerHTML =
                "🟢 LONG";

            signal.style.color =
                "#00ff88";

            reason.innerHTML =
                "Bullish PCS conditions confirmed.";

            return;

        }


        if (
            trend === "bearish" &&
            pcs === "yes" &&
            heiken === "yes" &&
            support === "yes" &&
            riskReward >= 2
        ) {

            signal.innerHTML =
                "🔴 SHORT";

            signal.style.color =
                "#ff4d6d";

            reason.innerHTML =
                "Bearish PCS conditions confirmed.";

            return;

        }


        signal.innerHTML =
            "🟡 WAIT";

        signal.style.color =
            "#ffd166";

        reason.innerHTML =
            "PCS conditions are not fully confirmed.";

    };


// =====================================================
// ADAPTIVE LOT PREVIEW
// =====================================================

function calculateAdaptiveLot(balance, riskAmount) {

    if (
        !balance ||
        balance <= 0 ||
        !riskAmount ||
        riskAmount <= 0
    ) {

        return 0;

    }


    var baseRisk =
        riskAmount / balance;


    var lot =
        baseRisk * 0.10;


    return Number(
        lot.toFixed(2)
    );

}


// =====================================================
// TRADE HISTORY
// =====================================================

function addTradeHistory(
    market,
    direction,
    entry,
    exit,
    profit
) {

    var trade = {

        market: market,

        direction: direction,

        entry: entry,

        exit: exit,

        profit: profit,

        time: new Date().toLocaleString()

    };


    tradeHistory.push(trade);

    renderTradeHistory();

}


// =====================================================
// RENDER HISTORY
// =====================================================

function renderTradeHistory() {

    var container =
        document.getElementById(
            "tradeHistory"
        );


    document.getElementById(
        "historyCount"
    ).innerHTML =
        tradeHistory.length;


    if (tradeHistory.length === 0) {

        container.innerHTML =
            '<div class="empty-state">' +
            'No trades recorded yet' +
            '</div>';

        return;

    }


    container.innerHTML = "";


    tradeHistory
        .slice()
        .reverse()
        .forEach(function (trade) {

            var item =
                document.createElement(
                    "div"
                );


            item.className =
                "history-item";


            var resultClass =
                trade.profit >= 0
                    ? "profit"
                    : "loss";


            var sign =
                trade.profit >= 0
                    ? "+"
                    : "";


            item.innerHTML =

                '<div class="history-top">' +

                    '<strong>' +
                        trade.market +
                    '</strong>' +

                    '<strong>' +
                        trade.direction +
                    '</strong>' +

                '</div>' +

                '<div class="history-bottom">' +

                    '<div>' +
                        '<small>ENTRY</small>' +
                        '<strong>' +
                            trade.entry +
                        '</strong>' +
                    '</div>' +

                    '<div>' +
                        '<small>EXIT</small>' +
                        '<strong>' +
                            trade.exit +
                        '</strong>' +
                    '</div>' +

                    '<div>' +
                        '<small>RESULT</small>' +
                        '<strong class="' +
                            resultClass +
                        '">' +
                            sign +
                            trade.profit.toFixed(2) +
                        '</strong>' +
                    '</div>' +

                '</div>' +

                '<small>' +
                    trade.time +
                '</small>';


            container.appendChild(item);

        });

}


// =====================================================
// INITIALIZE
// =====================================================

updateMarketDisplay();

updateTradingMode();

renderTradeHistory();

console.log(
    "PCS AI Master Phase 1 loaded."
);
