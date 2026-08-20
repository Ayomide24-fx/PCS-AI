// =====================================================
// PCS AI MASTER — FRONTEND ENGINE
// VERSION 2.0
// PHASE 1 FRONTEND UPGRADE
// =====================================================


// =====================================================
// BACKEND CONFIGURATION
// =====================================================

const PCS_BACKEND =
    "https://pcs-ai-backend.onrender.com";


// =====================================================
// GLOBAL PCS AI STATE
// =====================================================

const PCS_STATE = {

    backendOnline: false,

    selectedMarket: "XAUUSD",

    selectedTimeframe: "5m",

    tradingMode: "standard",

    environment: "demo",

    currentPrice: null,

    markets: [],

    lastMarketData: null,

    lastAnalysis: null,

    refreshInterval: null,

    scannerInterval: null,

    requestInProgress: false

};


// =====================================================
// DOM HELPER
// =====================================================

function getElement(id) {

    return document.getElementById(id);

}


// =====================================================
// SAFE TEXT UPDATE
// =====================================================

function setText(id, value) {

    const element = getElement(id);

    if (!element) {
        return;
    }

    element.textContent = value;

}


// =====================================================
// BACKEND HEALTH CHECK
// =====================================================

async function checkBackend() {

    const statusElement =
        getElement("priceStatus");

    try {

        if (statusElement) {

            statusElement.textContent =
                "● CONNECTING TO PCS AI BACKEND";

        }


        const response =
            await fetch(
                PCS_BACKEND + "/api/health",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Backend returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        PCS_STATE.backendOnline = true;


        console.log(
            "PCS AI Backend:",
            data
        );


        if (statusElement) {

            statusElement.textContent =
                "● PCS AI BACKEND ONLINE";

        }


        updateSystemStatus(
            "backend",
            true
        );


        return data;

    }

    catch (error) {

        PCS_STATE.backendOnline = false;


        console.error(
            "PCS AI backend connection failed:",
            error
        );


        if (statusElement) {

            statusElement.textContent =
                "● BACKEND CONNECTION ERROR";

        }


        updateSystemStatus(
            "backend",
            false
        );


        return null;

    }

}


// =====================================================
// UPDATE SYSTEM STATUS
// =====================================================

function updateSystemStatus(
    system,
    online
) {

    const rows =
        document.querySelectorAll(
            ".system-row"
        );


    rows.forEach(
        function (row) {

            const label =
                row.querySelector(
                    "span"
                );

            const status =
                row.querySelector(
                    "strong"
                );


            if (!label || !status) {
                return;
            }


            const name =
                label.textContent
                    .trim()
                    .toLowerCase();


            if (
                system === "backend" &&
                name.includes("market scanner")
            ) {

                status.textContent =
                    online
                        ? "READY"
                        : "OFFLINE";

                status.className =
                    online
                        ? "ready"
                        : "pending";

            }

        }
    );

}


// =====================================================
// LOAD ALL MARKETS
// =====================================================

async function loadMarkets() {

    const marketSelect =
        getElement("market");


    if (!marketSelect) {

        console.error(
            "PCS AI: Market selector not found."
        );

        return;

    }


    try {

        const response =
            await fetch(
                PCS_BACKEND + "/api/markets",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load markets. HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.categories
        ) {

            throw new Error(
                "Market categories missing from backend."
            );

        }


        const currentMarket =
            marketSelect.value ||
            PCS_STATE.selectedMarket;


        marketSelect.innerHTML = "";


        let totalLoaded = 0;


        Object.entries(
            data.categories
        ).forEach(
            function ([category, markets]) {

                if (
                    !Array.isArray(markets)
                ) {

                    return;

                }


                const group =
                    document.createElement(
                        "optgroup"
                    );


                group.label =
                    category.toUpperCase();


                markets.forEach(
                    function (symbol) {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            symbol;


                        option.textContent =
                            symbol;


                        if (
                            symbol ===
                            currentMarket
                        ) {

                            option.selected =
                                true;

                        }


                        group.appendChild(
                            option
                        );


                        PCS_STATE.markets.push(
                            symbol
                        );


                        totalLoaded++;

                    }
                );


                marketSelect.appendChild(
                    group
                );

            }
        );


        PCS_STATE.selectedMarket =
            marketSelect.value ||
            "XAUUSD";


        console.log(
            "PCS AI loaded " +
            totalLoaded +
            " markets."
        );


        updateMarketDisplay();

        await updateRealMarketData();

        updateScanner();


    }

    catch (error) {

        console.error(
            "PCS AI market loading failed:",
            error
        );

        const status =
            getElement("priceStatus");


        if (status) {

            status.textContent =
                "● MARKET LIST LOAD ERROR";

        }

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
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Market request failed. HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


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
// UPDATE REAL MARKET DATA
// =====================================================

async function updateRealMarketData() {

    const marketElement =
        getElement("market");


    const timeframeElement =
        getElement("timeframe");


    const priceElement =
        getElement("currentPrice");


    const statusElement =
        getElement("priceStatus");


    if (
        !marketElement ||
        !timeframeElement ||
        !priceElement ||
        !statusElement
    ) {

        return;

    }


    const market =
        marketElement.value ||
        "XAUUSD";


    const timeframe =
        timeframeElement.value ||
        "5m";


    PCS_STATE.selectedMarket =
        market;


    PCS_STATE.selectedTimeframe =
        timeframe;


    if (PCS_STATE.requestInProgress) {

        return;

    }


    PCS_STATE.requestInProgress =
        true;


    statusElement.textContent =
        "● REQUESTING MARKET DATA";


    try {

        const data =
            await getMarketData(
                market,
                timeframe
            );


        if (!data) {

            priceElement.textContent =
                "DATA ERROR";


            statusElement.textContent =
                "● MARKET DATA UNAVAILABLE";


            return;

        }


        PCS_STATE.lastMarketData =
            data;


        if (
            data.price === null ||
            data.price === undefined
        ) {

            PCS_STATE.currentPrice =
                null;


            priceElement.textContent =
                "WAITING FOR PRICE";


            statusElement.textContent =
                "● BACKEND ONLINE • MARKET DATA PENDING";


            return;

        }


        PCS_STATE.currentPrice =
            Number(data.price);


        priceElement.textContent =
            formatPrice(
                data.price
            );


        statusElement.textContent =
            "● LIVE • " +
            (data.symbol || market) +
            " • " +
            (data.timeframe || timeframe);


        updateScannerRow(
            market,
            data.price
        );


    }

    catch (error) {

        console.error(
            "PCS AI market update failed:",
            error
        );


        priceElement.textContent =
            "DATA ERROR";


        statusElement.textContent =
            "● MARKET DATA ERROR";

    }

    finally {

        PCS_STATE.requestInProgress =
            false;

    }

}


// =====================================================
// PRICE FORMATTER
// =====================================================

function formatPrice(price) {

    const number =
        Number(price);


    if (
        !Number.isFinite(number)
    ) {

        return String(price);

    }


    if (number >= 1000) {

        return number.toFixed(2);

    }


    if (number >= 100) {

        return number.toFixed(2);

    }


    if (number >= 10) {

        return number.toFixed(3);

    }


    return number.toFixed(5);

}


// =====================================================
// UPDATE MARKET DISPLAY
// =====================================================

function updateMarketDisplay() {

    const market =
        getElement("market");


    const timeframe =
        getElement("timeframe");


    if (!market || !timeframe) {
        return;
    }


    PCS_STATE.selectedMarket =
        market.value ||
        "XAUUSD";


    PCS_STATE.selectedTimeframe =
        timeframe.value ||
        "5m";


    console.log(
        "Selected market:",
        PCS_STATE.selectedMarket
    );


    console.log(
        "Selected timeframe:",
        PCS_STATE.selectedTimeframe
    );

}


// =====================================================
// MARKET CHANGE
// =====================================================

function handleMarketChange() {

    const market =
        getElement("market");


    if (!market) {
        return;
    }


    PCS_STATE.selectedMarket =
        market.value;


    updateMarketDisplay();

    updateRealMarketData();

}


// =====================================================
// TIMEFRAME CHANGE
// =====================================================

function handleTimeframeChange() {

    const timeframe =
        getElement("timeframe");


    if (!timeframe) {
        return;
    }


    PCS_STATE.selectedTimeframe =
        timeframe.value;


    updateMarketDisplay();

    updateRealMarketData();

}


// =====================================================
// TRADING MODE
// =====================================================

function setupTradingMode() {

    const mode =
        getElement("tradingMode");


    if (!mode) {
        return;
    }


    mode.addEventListener(
        "change",
        function () {

            PCS_STATE.tradingMode =
                this.value;


            updateModeDisplay(
                this.value
            );

        }
    );


    updateModeDisplay(
        mode.value
    );

}


// =====================================================
// UPDATE MODE DISPLAY
// =====================================================

function updateModeDisplay(mode) {

    const info =
        getElement("modeInfo");


    const positionLimit =
        getElement("positionLimit");


    const lotEngine =
        getElement("lotEngine");


    let description =
        "Standard mode: maximum 3 open positions per selected pair.";


    let positions =
        "3 / PAIR";


    let engine =
        "ADAPTIVE";


    if (mode === "scalper") {

        description =
            "Scalper mode: faster confirmations with controlled aggressive position management.";

        positions =
            "5 / PAIR";

        engine =
            "AGGRESSIVE";

    }


    if (mode === "mode3") {

        description =
            "Advanced mode: reserved for expanded PCS AI strategy logic.";

        positions =
            "CONFIG";

        engine =
            "ADVANCED";

    }


    if (mode === "mode4") {

        description =
            "Custom mode: trading parameters will be controlled by PCS AI configuration.";

        positions =
            "CUSTOM";

        engine =
            "CUSTOM";

    }


    if (info) {
        info.textContent =
            description;
    }


    if (positionLimit) {
        positionLimit.textContent =
            positions;
    }


    if (lotEngine) {
        lotEngine.textContent =
            engine;
    }

}


// =====================================================
// DEMO / LIVE ENVIRONMENT
// =====================================================

function setupEnvironment() {

    const button =
        getElement("environment");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            /*
             * IMPORTANT:
             * Frontend cannot enable real trading.
             * Backend remains the final authority.
             */

            if (
                PCS_STATE.environment ===
                "demo"
            ) {

                PCS_STATE.environment =
                    "demo";

                button.textContent =
                    "🧪 DEMO";

                button.className =
                    "environment demo";

                addNotification(
                    "Demo environment remains active. Live execution is disabled by the backend."
                );

                return;

            }

        }
    );

}


// =====================================================
// ANALYZE BUTTON
// =====================================================

function setupAnalyzeButton() {

    const button =
        getElement("analyze");


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        function () {

            analyzePCS();

        }
    );

}


// =====================================================
// PCS ANALYSIS ENGINE
// =====================================================

function analyzePCS() {

    const balance =
        readNumber("balance");


    const risk =
        readNumber("risk");


    const entry =
        readNumber("entry");


    const stop =
        readNumber("stop");


    const takeProfit =
        readNumber("takeProfit");


    const value =
        readNumber("value");


    const trend =
        getElement("trend")?.value ||
        "bullish";


    const pcs =
        getElement("pcs")?.value ||
        "no";


    const heiken =
        getElement("heiken")?.value ||
        "no";


    const support =
        getElement("support")?.value ||
        "no";


    const validation =
        validateTradeInputs(
            balance,
            risk,
            entry,
            stop,
            takeProfit,
            value
        );


    if (!validation.valid) {

        showWaitSignal(
            validation.message
        );

        return;

    }


    const riskAmount =
        balance *
        (risk / 100);


    const stopDistance =
        Math.abs(
            entry - stop
        );


    const rewardDistance =
        Math.abs(
            takeProfit - entry
        );


    const rr =
        rewardDistance /
        stopDistance;


    const positionSize =
        value > 0
            ? riskAmount /
              (stopDistance * value)
            : 0;


    const confidence =
        calculateConfidence(
            trend,
            pcs,
            heiken,
            support,
            rr
        );


    const signal =
        determineSignal(
            trend,
            pcs,
            heiken,
            support,
            rr,
            confidence
        );


    PCS_STATE.lastAnalysis = {

        signal,
        confidence,
        riskAmount,
        stopDistance,
        rewardDistance,
        rr,
        positionSize

    };


    updateTradeAnalysis(
        riskAmount,
        stopDistance,
        rewardDistance,
        positionSize,
        rr,
        risk
    );


    updateConfidence(
        confidence
    );


    updateSignal(
        signal,
        confidence
    );


    addNotification(
        "PCS analysis completed for " +
        PCS_STATE.selectedMarket
    );

}


// =====================================================
// READ NUMBER
// =====================================================

function readNumber(id) {

    const element =
        getElement(id);


    if (!element) {
        return NaN;
    }


    return Number(
        element.value
    );

}


// =====================================================
// VALIDATE TRADE INPUTS
// =====================================================

function validateTradeInputs(
    balance,
    risk,
    entry,
    stop,
    takeProfit,
    value
) {

    if (
        !Number.isFinite(balance) ||
        balance <= 0
    ) {

        return {
            valid: false,
            message:
                "Enter a valid account balance."
        };

    }


    if (
        !Number.isFinite(risk) ||
        risk <= 0
    ) {

        return {
            valid: false,
            message:
                "Enter a valid risk percentage."
        };

    }


    if (risk > 100) {

        return {
            valid: false,
            message:
                "Risk percentage cannot exceed 100%."
        };

    }


    if (
        !Number.isFinite(entry) ||
        !Number.isFinite(stop) ||
        !Number.isFinite(takeProfit)
    ) {

        return {
            valid: false,
            message:
                "Enter entry, stop loss and take profit."
        };

    }


    if (
        entry === stop
    ) {

        return {
            valid: false,
            message:
                "Entry and stop loss cannot be identical."
        };

    }


    if (
        takeProfit === entry
    ) {

        return {
            valid: false,
            message:
                "Take profit must differ from entry."
        };

    }


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return {
            valid: false,
            message:
                "Enter a valid value per price move."
        };

    }


    return {
        valid: true
    };

}


// =====================================================
// CONFIDENCE CALCULATION
// =====================================================

function calculateConfidence(
    trend,
    pcs,
    heiken,
    support,
    rr
) {

    let score = 0;


    if (
        trend === "bullish" ||
        trend === "bearish"
    ) {

        score += 20;

    }


    if (pcs === "yes") {

        score += 30;

    }


    if (heiken === "yes") {

        score += 20;

    }


    if (support === "yes") {

        score += 20;

    }


    if (rr >= 2) {

        score += 10;

    }
    else if (rr >= 1.5) {

        score += 5;

    }


    return Math.min(
        100,
        score
    );

}


// =====================================================
// SIGNAL DECISION
// =====================================================

function determineSignal(
    trend,
    pcs,
    heiken,
    support,
    rr,
    confidence
) {

    if (
        pcs !== "yes" ||
        heiken !== "yes" ||
        support !== "yes"
    ) {

        return "WAIT";

    }


    if (rr < 1.5) {

        return "WAIT";

    }


    if (confidence < 70) {

        return "WAIT";

    }


    if (trend === "bullish") {

        return "BUY";

    }


    if (trend === "bearish") {

        return "SELL";

    }


    return "WAIT";

}


// =====================================================
// UPDATE SIGNAL
// =====================================================

function updateSignal(
    signal,
    confidence
) {

    const element =
        getElement("signal");


    const reason =
        getElement("reason");


    if (!element) {
        return;
    }


    element.textContent =
        signal === "BUY"
            ? "🟢 BUY"
            : signal === "SELL"
                ? "🔴 SELL"
                : "🟡 WAIT";


    if (reason) {

        reason.textContent =
            signal === "BUY"
                ? "PCS conditions aligned for a bullish setup."
                : signal === "SELL"
                    ? "PCS conditions aligned for a bearish setup."
                    : "PCS confirmation is incomplete. No trade approval.";

    }


    console.log(
        "PCS signal:",
        signal,
        "Confidence:",
        confidence + "%"
    );

}

// =====================================================
// SHOW WAIT SIGNAL
// =====================================================

function showWaitSignal(
    message
) {

    const signal =
        getElement("signal");


    const reason =
        getElement("reason");


    if (signal) {

        signal.textContent =
            "🟡 WAIT";

    }


    if (reason) {

        reason.textContent =
            message;

    }


    updateConfidence(
        0
    );

}


// =====================================================
// UPDATE CONFIDENCE
// =====================================================

function updateConfidence(
    confidence
) {

    const fill =
        getElement("confidenceFill");


    const value =
        getElement("confidenceValue");


    const status =
        getElement("confidenceStatus");


    const safeConfidence =
        Math.max(
            0,
            Math.min(
                100,
                Number(confidence) || 0
            )
        );


    if (fill) {

        fill.style.width =
            safeConfidence + "%";

    }


    if (value) {

        value.textContent =
            safeConfidence + "%";

    }


    if (status) {

        if (safeConfidence >= 80) {

            status.textContent =
                "HIGH CONFIDENCE";

        }
        else if (safeConfidence >= 70) {

            status.textContent =
                "VALID PCS SETUP";

        }
        else if (safeConfidence >= 50) {

            status.textContent =
                "PARTIAL CONFIRMATION";

        }
        else {

            status.textContent =
                "WAITING FOR CONFIRMATION";

        }

    }

}


// =====================================================
// UPDATE TRADE ANALYSIS
// =====================================================

function updateTradeAnalysis(
    riskAmount,
    stopDistance,
    rewardDistance,
    positionSize,
    rr,
    risk
) {

    setText(
        "riskResult",
        "$" + riskAmount.toFixed(2)
    );


    setText(
        "distanceResult",
        stopDistance.toFixed(5)
    );


    setText(
        "positionResult",
        positionSize.toFixed(4)
    );


    setText(
        "rewardResult",
        rewardDistance.toFixed(5)
    );


    setText(
        "rrResult",
        rr.toFixed(2) + "R"
    );


    let level =
        "LOW";


    if (risk > 5) {

        level =
            "HIGH";

    }
    else if (risk > 2) {

        level =
            "MEDIUM";

    }


    setText(
        "riskLevel",
        level
    );

}


// =====================================================
// MARKET SCANNER
// =====================================================

async function updateScanner() {

    const symbols = [

        "XAUUSD",
        "EURUSD",
        "GBPUSD",
        "BTCUSD",
        "NAS100"

    ];


    for (
        const symbol of symbols
    ) {

        try {

            const data =
                await getMarketData(
                    symbol,
                    "5m"
                );


            if (
                data &&
                data.price !== null &&
                data.price !== undefined
            ) {

                updateScannerRow(
                    symbol,
                    data.price
                );

            }

        }

        catch (error) {

            console.warn(
                "Scanner error:",
                symbol,
                error
            );

        }

    }

}


// =====================================================
// UPDATE SCANNER ROW
// =====================================================

function updateScannerRow(
    symbol,
    price
) {

    const id =
        "scan" + symbol;


    const element =
        getElement(id);


    if (!element) {
        return;
    }


    element.textContent =
        formatPrice(price);

}


// =====================================================
// ADD NOTIFICATION
// =====================================================

function addNotification(
    message
) {

    const box =
        getElement(
            "notificationBox"
        );


    if (!box) {
        return;
    }


    box.textContent =
        message;


    const status =
        getElement(
            "notificationStatus"
        );


    if (status) {

        status.textContent =
            "● NEW";

        status.className =
            "live";

    }


    setTimeout(
        function () {

            if (status) {

                status.textContent =
                    "● READY";

            }

        },
        4000
    );

}


// =====================================================
// AUTOMATIC MARKET REFRESH
// =====================================================

function startMarketRefresh() {

    if (
        PCS_STATE.refreshInterval
    ) {

        clearInterval(
            PCS_STATE.refreshInterval
        );

    }


    PCS_STATE.refreshInterval =
        setInterval(
            function () {

                updateRealMarketData();

            },
            10000
        );

}

// =====================================================
// AUTOMATIC SCANNER REFRESH
// =====================================================

function startScannerRefresh() {

    if (
        PCS_STATE.scannerInterval
    ) {

        clearInterval(
            PCS_STATE.scannerInterval
        );

    }


    PCS_STATE.scannerInterval =
        setInterval(
            function () {

                updateScanner();

            },
            30000
        );

}


// =====================================================
// BASIC KEYBOARD SHORTCUT
// =====================================================

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                event.target.tagName !==
                    "INPUT"
            ) {

                const analyze =
                    getElement(
                        "analyze"
                    );


                if (analyze) {

                    analyze.click();

                }

            }

        }
    );

}


// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {

    const market =
        getElement("market");


    const timeframe =
        getElement("timeframe");


    if (market) {

        market.addEventListener(
            "change",
            handleMarketChange
        );

    }


    if (timeframe) {

        timeframe.addEventListener(
            "change",
            handleTimeframeChange
        );

    }


    setupTradingMode();

    setupEnvironment();

    setupAnalyzeButton();

    setupKeyboard();

}


// =====================================================
// INITIALIZE PCS AI
// =====================================================

async function initializePCS() {

    console.log(
        "=========================================="
    );

    console.log(
        "        PCS AI FRONTEND INITIALIZING"
    );

    console.log(
        "=========================================="
    );


    setupEventListeners();


    const backend =
        await checkBackend();


    if (backend) {

        await loadMarkets();

    }


    startMarketRefresh();

    startScannerRefresh();


    console.log(
        "PCS AI frontend initialization complete."
    );

}


// =====================================================
// START APPLICATION
// =====================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePCS
    );

}
else {

    initializePCS();

}
