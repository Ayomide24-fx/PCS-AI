// =====================================================
// PCS AI MASTER — FRONTEND CONTROLLER
// Backend: PCS AI v3.3
// =====================================================


// =====================================================
// CONFIGURATION
// =====================================================

const PCS_BACKEND =
    "https://pcs-ai-backend.onrender.com";

const PRICE_REFRESH_INTERVAL = 10000;

let selectedMarket = "XAUUSD";
let selectedTimeframe = "5m";

let backendOnline = false;
let marketDataLoading = false;
let refreshTimer = null;


// =====================================================
// MODE CONFIGURATION
// IMPORTANT:
// Every mode has its OWN independent configuration/state.
// Changing one mode does not modify another mode.
// =====================================================

const MODE_DEFAULTS = {

    standard: {
        name: "STANDARD",
        riskPerTrade: 1.0,
        dailyDrawdown: 3.0,
        maxDrawdown: 6.0,
        profitTarget: 0,
        maxTrades: 3,
        positionLimit: "3 / PAIR",
        engine: "ADAPTIVE"
    },

    scalper: {
        name: "SCALPER",
        riskPerTrade: 1.0,
        dailyDrawdown: 3.0,
        maxDrawdown: 6.0,
        profitTarget: 0,
        maxTrades: 5,
        positionLimit: "5 / PAIR",
        engine: "SCALPER"
    },

    compounding: {
        name: "COMPOUNDING",
        riskPerTrade: 2.0,
        dailyDrawdown: 4.0,
        maxDrawdown: 8.0,
        profitTarget: 0,
        maxTrades: 5,
        positionLimit: "5 / PAIR",
        engine: "COMPOUNDING"
    },

    prop: {
        name: "PROP",
        riskPerTrade: 0.5,
        dailyDrawdown: 1.5,
        maxDrawdown: 5.0,
        profitTarget: 10.0,
        maxTrades: 3,
        positionLimit: "3 / PAIR",
        engine: "PROP RISK"
    }

};


// =====================================================
// INDEPENDENT MODE STATES
// =====================================================

const modeStates = {

    standard: createModeState("standard"),
    scalper: createModeState("scalper"),
    compounding: createModeState("compounding"),
    prop: createModeState("prop")

};


function createModeState(mode) {

    const defaults =
        MODE_DEFAULTS[mode];

    return {

        mode: mode,

        balance: 0,

        startingBalance: 0,

        dailyStartBalance: 0,

        dailyProfit: 0,

        dailyLoss: 0,

        totalProfit: 0,

        totalLoss: 0,

        tradesToday: 0,

        totalTrades: 0,

        openPositions: [],

        tradeHistory: [],

        notifications: [],

        riskPerTrade:
            defaults.riskPerTrade,

        dailyDrawdown:
            defaults.dailyDrawdown,

        maxDrawdown:
            defaults.maxDrawdown,

        profitTarget:
            defaults.profitTarget,

        maxTrades:
            defaults.maxTrades,

        active: false,

        initialized: false,

        lastSignal: "WAIT",

        lastConfidence: 0

    };

}


// =====================================================
// ACTIVE MODE
// =====================================================

function getActiveMode() {

    const modeElement =
        getElement("tradingMode");

    if (!modeElement) {
        return "standard";
    }

    const mode =
        modeElement.value;

    if (!modeStates[mode]) {
        return "standard";
    }

    return mode;

}


function getActiveModeState() {

    return modeStates[
        getActiveMode()
    ];

}


// =====================================================
// DOM HELPERS
// =====================================================

function getElement(id) {

    return document.getElementById(id);

}


function setText(id, value) {

    const element =
        getElement(id);

    if (element) {
        element.textContent = value;
    }

}


function setHTML(id, value) {

    const element =
        getElement(id);

    if (element) {
        element.innerHTML = value;
    }

}


// =====================================================
// SAFE NUMBER
// =====================================================

function safeNumber(value, fallback = 0) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


// =====================================================
// BACKEND HEALTH CHECK
// =====================================================

async function checkBackend() {

    try {

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

        backendOnline = true;

        console.log(
            "PCS AI Backend:",
            data
        );

        updateBackendStatus(true);

        updateSystemStatus(
            true,
            data
        );

        return data;

    }

    catch (error) {

        backendOnline = false;

        console.error(
            "PCS AI backend connection failed:",
            error
        );

        updateBackendStatus(false);

        updateSystemStatus(
            false,
            null
        );

        return null;

    }

}


// =====================================================
// UPDATE BACKEND STATUS
// =====================================================

function updateBackendStatus(
    isOnline
) {

    const statusElement =
        document.querySelector(
            ".status"
        );

    const backendElement =
        getElement("backendStatus");

    const headerStatus =
        getElement("headerStatus");

    if (statusElement) {

        statusElement.innerHTML =
            isOnline
                ? '<span></span> ONLINE'
                : '<span></span> OFFLINE';

        statusElement.style.color =
            isOnline
                ? "var(--green)"
                : "var(--red)";

    }

    if (headerStatus) {

        headerStatus.textContent =
            isOnline
                ? "ONLINE"
                : "OFFLINE";

    }

    if (backendElement) {

        backendElement.textContent =
            isOnline
                ? "ONLINE"
                : "OFFLINE";

        backendElement.classList.remove(
            "backend-loading",
            "backend-online",
            "backend-offline"
        );

        backendElement.classList.add(
            isOnline
                ? "backend-online"
                : "backend-offline"
        );

    }

}


// =====================================================
// UPDATE SYSTEM STATUS
// =====================================================

function updateSystemStatus(
    online,
    healthData
) {

    const versionElement =
        getElement("backendVersion");

    const executionElement =
        getElement("executionStatus");

    const liveTradingElement =
        getElement("liveTradingStatus");

    const scannerElement =
        getElement("systemScanner");

    if (versionElement) {

        versionElement.textContent =
            healthData &&
            (
                healthData.version ||
                healthData.systemVersion ||
                healthData.data?.version
            )
            ? (
                healthData.version ||
                healthData.systemVersion ||
                healthData.data.version
            )
            : "v3.3";

    }

    if (executionElement) {

        executionElement.textContent =
            "DEMO";

    }

    if (liveTradingElement) {

        liveTradingElement.textContent =
            "🔒 DISABLED";

        liveTradingElement.classList.remove(
            "backend-online"
        );

        liveTradingElement.classList.add(
            "backend-offline"
        );

    }

    if (scannerElement) {

        scannerElement.textContent =
            online
                ? "ONLINE"
                : "OFFLINE";

        scannerElement.className =
            online
                ? "ready"
                : "error";

    }

    setText(
        "systemTradingView",
        "PENDING"
    );

    setText(
        "systemMT5",
        "CONFIGURED"
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

        return false;

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
            !data.categories ||
            typeof data.categories !== "object"
        ) {

            throw new Error(
                "Market categories missing from backend."
            );

        }

        const currentMarket =
            marketSelect.value ||
            selectedMarket ||
            "XAUUSD";

        marketSelect.innerHTML = "";

        let marketFound = false;

        Object.entries(
            data.categories
        ).forEach(
            function ([category, markets]) {

                if (!Array.isArray(markets)) {
                    return;
                }

                const group =
                    document.createElement(
                        "optgroup"
                    );

                group.label =
                    String(category).toUpperCase();

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

                            marketFound = true;

                        }

                        group.appendChild(
                            option
                        );

                    }
                );

                if (
                    group.children.length > 0
                ) {

                    marketSelect.appendChild(
                        group
                    );

                }

            }
        );

        if (!marketFound) {

            const firstOption =
                marketSelect.querySelector(
                    "option"
                );

            if (firstOption) {

                firstOption.selected =
                    true;

            }

        }

        selectedMarket =
            marketSelect.value ||
            "XAUUSD";

        console.log(
            "PCS AI loaded markets:",
            data.totalMarkets
        );

        updateMarketDisplay();

        return true;

    }

    catch (error) {

        console.error(
            "PCS AI market loading failed:",
            error
        );

        updateMarketDisplay();

        return false;

    }

}


// =====================================================
// MARKET DISPLAY
// =====================================================

function updateMarketDisplay() {

    const marketElement =
        getElement("market");

    const timeframeElement =
        getElement("timeframe");

    if (marketElement) {

        selectedMarket =
            marketElement.value ||
            selectedMarket ||
            "XAUUSD";

    }

    if (timeframeElement) {

        selectedTimeframe =
            timeframeElement.value ||
            selectedTimeframe ||
            "5m";

    }

    const priceStatus =
        getElement("priceStatus");

    if (
        priceStatus &&
        !backendOnline
    ) {

        priceStatus.textContent =
            "● BACKEND OFFLINE";

    }

}


// =====================================================
// GET MARKET DATA
// =====================================================

async function getMarketData(
    symbol,
    timeframe
) {

    if (
        !symbol ||
        !timeframe
    ) {

        return null;

    }

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

        return await response.json();

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
// FORMAT PRICE
// =====================================================

function formatPrice(price) {

    if (
        price === null ||
        price === undefined ||
        price === ""
    ) {

        return "--";

    }

    const numericPrice =
        Number(price);

    if (
        !Number.isFinite(
            numericPrice
        )
    ) {

        return String(price);

    }

    if (numericPrice >= 100) {

        return numericPrice.toFixed(2);

    }

    if (numericPrice >= 10) {

        return numericPrice.toFixed(4);

    }

    return numericPrice.toFixed(5);

}


// =====================================================
// UPDATE REAL MARKET DATA
// =====================================================

async function updateRealMarketData() {

    if (marketDataLoading) {
        return;
    }

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

    selectedMarket =
        marketElement.value ||
        "XAUUSD";

    selectedTimeframe =
        timeframeElement.value ||
        "5m";

    marketDataLoading = true;

    statusElement.textContent =
        "● CONNECTING TO PCS AI BACKEND";

    const data =
        await getMarketData(
            selectedMarket,
            selectedTimeframe
        );

    marketDataLoading = false;

    if (!data) {

        priceElement.textContent =
            "DATA ERROR";

        statusElement.textContent =
            "● MARKET DATA ERROR";

        return;

    }

    backendOnline = true;

    if (
        data.price === null ||
        data.price === undefined
    ) {

        priceElement.textContent =
            "WAITING FOR PRICE";

        statusElement.textContent =
            "● BACKEND ONLINE • MARKET DATA PENDING";

        return;

    }

    priceElement.textContent =
        formatPrice(data.price);

    statusElement.textContent =
        "● LIVE • " +
        (
            data.symbol ||
            selectedMarket
        ) +
        " • " +
        (
            data.timeframe ||
            selectedTimeframe
        );

}


// =====================================================
// UPDATE SINGLE SCANNER PRICE
// =====================================================

async function updateScannerPrice(
    symbol,
    elementId
) {

    const element =
        getElement(elementId);

    if (!element) {
        return;
    }

    const data =
        await getMarketData(
            symbol,
            "5m"
        );

    if (
        !data ||
        data.price === null ||
        data.price === undefined
    ) {

        element.textContent =
            "--";

        return;

    }

    element.textContent =
        formatPrice(data.price);

}


// =====================================================
// UPDATE MARKET SCANNER
// =====================================================

async function updateScanner() {

    await Promise.allSettled([

        updateScannerPrice(
            "XAUUSD",
            "scanXAUUSD"
        ),

        updateScannerPrice(
            "EURUSD",
            "scanEURUSD"
        ),

        updateScannerPrice(
            "GBPUSD",
            "scanGBPUSD"
        ),

        updateScannerPrice(
            "BTCUSD",
            "scanBTCUSD"
        ),

        updateScannerPrice(
            "NAS100",
            "scanNAS100"
        )

    ]);

    const scannerReady =
        getElement("scannerReady");

    if (scannerReady) {

        scannerReady.textContent =
            backendOnline
                ? "● LIVE"
                : "● OFFLINE";

    }

}


// =====================================================
// MARKET CHANGE
// =====================================================

function handleMarketChange() {

    const marketElement =
        getElement("market");

    if (!marketElement) {
        return;
    }

    selectedMarket =
        marketElement.value ||
        "XAUUSD";

    updateMarketDisplay();

    updateRealMarketData();

}


// =====================================================
// TIMEFRAME CHANGE
// =====================================================

function handleTimeframeChange() {

    const timeframeElement =
        getElement("timeframe");

    if (!timeframeElement) {
        return;
    }

    selectedTimeframe =
        timeframeElement.value ||
        "5m";

    updateMarketDisplay();

    updateRealMarketData();

}


// =====================================================
// MODE CONFIGURATION HELPERS
// =====================================================

function getModeDefaults(mode) {

    return MODE_DEFAULTS[
        mode
    ] || MODE_DEFAULTS.standard;

}


// =====================================================
// LOAD MODE SETTINGS INTO UI
// =====================================================

function loadModeSettings(
    mode
) {

    const state =
        modeStates[mode];

    if (!state) {
        return;
    }

    const riskInput =
        getElement("risk");

    if (riskInput) {

        riskInput.value =
            state.riskPerTrade;

    }

    const propMaxDrawdown =
        getElement("propMaxDrawdown");

    const propDailyLoss =
        getElement("propDailyLoss");

    const propProfitTarget =
        getElement("propProfitTarget");

    if (propMaxDrawdown) {

        propMaxDrawdown.value =
            state.maxDrawdown;

    }

    if (propDailyLoss) {

        propDailyLoss.value =
            state.dailyDrawdown;

    }

    if (propProfitTarget) {

        propProfitTarget.value =
            state.profitTarget;

    }

}


// =====================================================
// SAVE ACTIVE MODE SETTINGS
// =====================================================

function saveActiveModeSettings() {

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    if (!state) {
        return;
    }

    const riskInput =
        getElement("risk");

    if (riskInput) {

        const risk =
            safeNumber(
                riskInput.value,
                state.riskPerTrade
            );

        if (
            risk >= 0 &&
            risk <= 100
        ) {

            state.riskPerTrade =
                risk;

        }

    }

    if (mode === "prop") {

        const maxDrawdown =
            safeNumber(
                getElement(
                    "propMaxDrawdown"
                )?.value,
                state.maxDrawdown
            );

        const dailyLoss =
            safeNumber(
                getElement(
                    "propDailyLoss"
                )?.value,
                state.dailyDrawdown
            );

        const profitTarget =
            safeNumber(
                getElement(
                    "propProfitTarget"
                )?.value,
                state.profitTarget
            );

        if (
            maxDrawdown >= 0 &&
            maxDrawdown <= 100
        ) {

            state.maxDrawdown =
                maxDrawdown;

        }

        if (
            dailyLoss >= 0 &&
            dailyLoss <= 100
        ) {

            state.dailyDrawdown =
                dailyLoss;

        }

        if (
            profitTarget >= 0
        ) {

            state.profitTarget =
                profitTarget;

        }

    }

}


// =====================================================
// PROP RULE VALIDATION
// =====================================================

function validatePropRules() {

    const state =
        modeStates.prop;

    const status =
        getElement("propRuleStatus");

    if (!status) {
        return false;
    }

    const maxDrawdown =
        safeNumber(
            getElement(
                "propMaxDrawdown"
            )?.value
        );

    const dailyLoss =
        safeNumber(
            getElement(
                "propDailyLoss"
            )?.value
        );

    const profitTarget =
        safeNumber(
            getElement(
                "propProfitTarget"
            )?.value
        );

    if (
        maxDrawdown <= 0 ||
        dailyLoss <= 0 ||
        profitTarget < 0
    ) {

        status.textContent =
            "🔴 INVALID PROP SETTINGS";

        status.classList.remove(
            "valid"
        );

        status.classList.add(
            "invalid"
        );

        return false;

    }

    if (
        dailyLoss >
        maxDrawdown
    ) {

        status.textContent =
            "🔴 DAILY LOSS CANNOT EXCEED MAX DRAWDOWN";

        status.classList.remove(
            "valid"
        );

        status.classList.add(
            "invalid"
        );

        return false;

    }

    state.maxDrawdown =
        maxDrawdown;

    state.dailyDrawdown =
        dailyLoss;

    state.profitTarget =
        profitTarget;

    status.textContent =
        "🟢 PROP RULES CONFIGURED • " +
        "DD " +
        maxDrawdown +
        "% • DAILY " +
        dailyLoss +
        "% • TARGET " +
        profitTarget +
        "%";

    status.classList.remove(
        "invalid"
    );

    status.classList.add(
        "valid"
    );

    return true;

}


// =====================================================
// TRADING MODE
// =====================================================

function updateTradingMode() {

    saveActiveModeSettings();

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    const defaults =
        getModeDefaults(mode);

    const infoElement =
        getElement("modeInfo");

    const positionLimit =
        getElement("positionLimit");

    const lotEngine =
        getElement("lotEngine");

    const modeStatus =
        getElement("modeStatus");

    const propSettings =
        getElement("propSettings");

    if (mode === "standard") {

        if (infoElement) {

            infoElement.textContent =
                "Standard mode: controlled PCS confirmation with strict independent risk management.";

        }

    }

    else if (mode === "scalper") {

        if (infoElement) {

            infoElement.textContent =
                "Scalper mode: faster PCS confirmation and independent position stacking.";

        }

    }

    else if (mode === "compounding") {

        if (infoElement) {

            infoElement.textContent =
                "Compounding mode: independent account growth engine using its own balance and risk settings.";

        }

    }

    else if (mode === "prop") {

        if (infoElement) {

            infoElement.textContent =
                "Prop mode: independent prop-firm risk engine. Its drawdown and daily-loss rules do not affect other modes.";

        }

    }

    if (positionLimit) {

        positionLimit.textContent =
            defaults.positionLimit;

    }

    if (lotEngine) {

        lotEngine.textContent =
            defaults.engine;

    }

    if (modeStatus) {

        modeStatus.textContent =
            "● " +
            defaults.name +
            " READY";

    }

    if (propSettings) {

        propSettings.hidden =
            mode !== "prop";

    }

    loadModeSettings(mode);

    if (mode === "prop") {

        validatePropRules();

    }

    updateModeDashboard();

}

// =====================================================
// MODE DASHBOARD
// =====================================================

function updateModeDashboard() {

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    if (!state) {
        return;
    }

    const balanceElement =
        getElement("balance");

    if (
        balanceElement &&
        state.initialized
    ) {

        balanceElement.value =
            state.balance;

    }

}


// =====================================================
// ENVIRONMENT BUTTON
// =====================================================

function setupEnvironmentButton() {

    const button =
        getElement("environment");

    if (!button) {
        return;
    }

    button.textContent =
        "🧪 DEMO";

    button.classList.remove(
        "live"
    );

    button.classList.add(
        "demo"
    );

    button.addEventListener(
        "click",
        function () {

            button.textContent =
                "🧪 DEMO";

            button.classList.remove(
                "live"
            );

            button.classList.add(
                "demo"
            );

            showNotification(
                "Demo environment is active. Live trading remains disabled."
            );

        }
    );

}


// =====================================================
// NOTIFICATIONS
// =====================================================

function showNotification(
    message
) {

    const box =
        getElement("notificationBox");

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

        status.classList.remove(
            "pending"
        );

        status.classList.add(
            "ready"
        );

    }

    setTimeout(
        function () {

            if (status) {

                status.textContent =
                    "● READY";

            }

        },
        3000
    );

}


// =====================================================
// RISK CALCULATION
// =====================================================

function calculateRisk() {

    const balance =
        safeNumber(
            getElement(
                "balance"
            )?.value
        );

    const riskPercent =
        safeNumber(
            getElement(
                "risk"
            )?.value
        );

    const entry =
        safeNumber(
            getElement(
                "entry"
            )?.value
        );

    const stop =
        safeNumber(
            getElement(
                "stop"
            )?.value
        );

    const takeProfit =
        safeNumber(
            getElement(
                "takeProfit"
            )?.value
        );

    const valuePerMove =
        safeNumber(
            getElement(
                "value"
            )?.value
        );

    const riskAmount =
        balance *
        riskPercent /
        100;

    const stopDistance =
        Math.abs(
            entry - stop
        );

    const rewardDistance =
        Math.abs(
            takeProfit - entry
        );

    let positionSize = 0;

    if (
        stopDistance > 0 &&
        valuePerMove > 0
    ) {

        positionSize =
            riskAmount /
            (
                stopDistance *
                valuePerMove
            );

    }

    const rr =
        stopDistance > 0
            ? rewardDistance /
              stopDistance
            : 0;

    let riskLevel =
        "LOW";

    if (riskPercent > 2) {
        riskLevel = "HIGH";
    }

    if (riskPercent > 5) {
        riskLevel = "EXTREME";
    }

    setText(
        "riskResult",
        "$" +
        riskAmount.toFixed(2)
    );

    setText(
        "distanceResult",
        stopDistance > 0
            ? stopDistance.toFixed(5)
            : "--"
    );

    setText(
        "positionResult",
        positionSize > 0
            ? positionSize.toFixed(4)
            : "--"
    );

    setText(
        "rewardResult",
        rewardDistance > 0
            ? rewardDistance.toFixed(5)
            : "--"
    );

    setText(
        "rrResult",
        rr > 0
            ? rr.toFixed(2) + ":1"
            : "--"
    );

    setText(
        "riskLevel",
        riskLevel
    );

    const mode =
        getActiveMode();

    modeStates[
        mode
    ].riskPerTrade =
        riskPercent;

    return {

        balance,
        riskPercent,
        riskAmount,
        entry,
        stop,
        takeProfit,
        stopDistance,
        rewardDistance,
        positionSize,
        rr,
        riskLevel

    };

}


// =====================================================
// PCS CONFIRMATION ENGINE
// =====================================================

function analyzePCS() {

    const trend =
        getElement(
            "trend"
        )?.value;

    const pcs =
        getElement(
            "pcs"
        )?.value;

    const heiken =
        getElement(
            "heiken"
        )?.value;

    const support =
        getElement(
            "support"
        )?.value;

    const setup =
        calculateRisk();

    let score = 0;

    if (pcs === "yes") {
        score += 1;
    }

    if (heiken === "yes") {
        score += 1;
    }

    if (support === "yes") {
        score += 1;
    }

    if (
        trend === "bullish" ||
        trend === "bearish"
    ) {

        score += 1;

    }

    let signal =
        "WAIT";

    if (
        score >= 4 &&
        setup.stopDistance > 0
    ) {

        signal =
            trend === "bullish"
                ? "BUY"
                : "SELL";

    }

    const confidence =
        Math.round(
            (
                score / 4
            ) * 100
        );

    updateSignal(
        signal,
        confidence,
        score,
        trend,
        setup
    );

    return {

        signal,
        confidence,
        score,
        trend,
        setup

    };

}

// =====================================================
// UPDATE SIGNAL
// =====================================================

function updateSignal(
    signal,
    confidence,
    score,
    trend,
    setup
) {

    const signalElement =
        getElement("signal");

    const reasonElement =
        getElement("reason");

    const confidenceFill =
        getElement(
            "confidenceFill"
        );

    const confidenceValue =
        getElement(
            "confidenceValue"
        );

    const confidenceStatus =
        getElement(
            "confidenceStatus"
        );

    if (signalElement) {

        if (signal === "BUY") {

            signalElement.textContent =
                "🟢 BUY";

            signalElement.style.color =
                "var(--green)";

        }

        else if (signal === "SELL") {

            signalElement.textContent =
                "🔴 SELL";

            signalElement.style.color =
                "var(--red)";

        }

        else {

            signalElement.textContent =
                "🟡 WAIT";

            signalElement.style.color =
                "var(--yellow)";

        }

    }

    if (reasonElement) {

        if (signal === "WAIT") {

            reasonElement.textContent =
                "PCS confirmation incomplete. Waiting for full confirmation.";

        }

        else {

            reasonElement.textContent =
                "PCS confirmation complete. " +
                signal +
                " setup detected with " +
                confidence +
                "% confirmation.";

        }

    }

    if (confidenceFill) {

        confidenceFill.style.width =
            confidence + "%";

    }

    if (confidenceValue) {

        confidenceValue.textContent =
            confidence + "%";

    }

    if (confidenceStatus) {

        confidenceStatus.textContent =
            signal === "WAIT"
                ? "WAITING FOR FULL CONFIRMATION"
                : "PCS CONFIRMATION ACTIVE";

    }

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    state.lastSignal =
        signal;

    state.lastConfidence =
        confidence;

}


// =====================================================
// MODE RISK GUARD
// =====================================================

function checkModeRiskLimits(
    mode
) {

    const state =
        modeStates[mode];

    if (!state) {

        return {
            allowed: false,
            reason: "MODE NOT FOUND"
        };

    }

    if (
        state.dailyStartBalance <= 0
    ) {

        return {
            allowed: true,
            reason: "DAILY BASELINE NOT INITIALIZED"
        };

    }

    const dailyLossPercent =
        state.dailyLoss /
        state.dailyStartBalance *
        100;

    const totalDrawdown =
        state.startingBalance > 0
            ? (
                (
                    state.startingBalance -
                    state.balance
                ) /
                state.startingBalance
            ) * 100
            : 0;

    if (
        dailyLossPercent >=
        state.dailyDrawdown
    ) {

        return {

            allowed: false,

            reason:
                "DAILY DRAWDOWN LIMIT REACHED"

        };

    }

    if (
        totalDrawdown >=
        state.maxDrawdown
    ) {

        return {

            allowed: false,

            reason:
                "MAXIMUM DRAWDOWN LIMIT REACHED"

        };

    }

    if (
        state.tradesToday >=
        state.maxTrades
    ) {

        return {

            allowed: false,

            reason:
                "MAXIMUM TRADES REACHED"

        };

    }

    return {

        allowed: true,

        reason: "RISK LIMITS CLEAR"

    };

}


// =====================================================
// INITIALIZE MODE ACCOUNT
// =====================================================

function initializeModeAccount(
    mode,
    balance
) {

    const state =
        modeStates[mode];

    if (!state) {
        return;
    }

    const amount =
        safeNumber(
            balance
        );

    if (amount <= 0) {
        return;
    }

    state.balance =
        amount;

    state.startingBalance =
        amount;

    state.dailyStartBalance =
        amount;

    state.dailyProfit =
        0;

    state.dailyLoss =
        0;

    state.totalProfit =
        0;

    state.totalLoss =
        0;

    state.tradesToday =
        0;

    state.totalTrades =
        0;

    state.openPositions =
        [];

    state.tradeHistory =
        [];

    state.active =
        true;

    state.initialized =
        true;

}


// =====================================================
// INDEPENDENT MODE TRADE STATE
// =====================================================

function registerVirtualTrade(
    mode,
    signal,
    entry,
    stop,
    takeProfit,
    positionSize
) {

    const state =
        modeStates[mode];

    if (!state) {
        return null;
    }

    const riskCheck =
        checkModeRiskLimits(
            mode
        );

    if (!riskCheck.allowed) {

        showNotification(
            mode.toUpperCase() +
            ": " +
            riskCheck.reason
        );

        return null;

    }

    if (
        !state.initialized
    ) {

        showNotification(
            mode.toUpperCase() +
            ": initialize account balance first."
        );

        return null;

    }

    const trade = {

        id:
            mode +
            "-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2, 8),

        mode,

        symbol:
            selectedMarket,

        timeframe:
            selectedTimeframe,

        signal,

        entry,

        stop,

        takeProfit,

        positionSize,

        riskPercent:
            state.riskPerTrade,

        status:
            "OPEN",

        openedAt:
            new Date().toISOString()

    };

    state.openPositions.push(
        trade
    );

    state.tradesToday += 1;

    state.totalTrades += 1;

    renderActiveModePositions();

    return trade;

}

// =====================================================
// CLOSE VIRTUAL TRADE
// =====================================================

function closeVirtualTrade(
    mode,
    tradeId,
    profitLoss
) {

    const state =
        modeStates[mode];

    if (!state) {
        return false;
    }

    const index =
        state.openPositions.findIndex(
            function (trade) {

                return (
                    trade.id ===
                    tradeId
                );

            }
        );

    if (index === -1) {
        return false;
    }

    const trade =
        state.openPositions[
            index
        ];

    const pnl =
        safeNumber(
            profitLoss
        );

    trade.status =
        "CLOSED";

    trade.profitLoss =
        pnl;

    trade.closedAt =
        new Date().toISOString();

    state.balance += pnl;

    if (pnl >= 0) {

        state.dailyProfit += pnl;

        state.totalProfit += pnl;

    }

    else {

        state.dailyLoss +=
            Math.abs(pnl);

        state.totalLoss +=
            Math.abs(pnl);

    }

    state.tradeHistory.unshift(
        trade
    );

    state.openPositions.splice(
        index,
        1
    );

    renderActiveModePositions();

    renderActiveModeHistory();

    return true;

}


// =====================================================
// RENDER OPEN POSITIONS
// =====================================================

function renderActiveModePositions() {

    const container =
        getElement(
            "openPositions"
        );

    const count =
        getElement(
            "openCount"
        );

    if (!container) {
        return;
    }

    const state =
        getActiveModeState();

    if (count) {

        count.textContent =
            state.openPositions.length;

    }

    if (
        state.openPositions.length ===
        0
    ) {

        container.innerHTML =
            "No active trades";

        return;

    }

    container.innerHTML =
        state.openPositions
            .map(
                function (trade) {

                    return `
                        <div class="position-card">

                            <div class="position-top">

                                <strong>
                                    ${escapeHTML(
                                        trade.symbol
                                    )}
                                    •
                                    ${escapeHTML(
                                        trade.signal
                                    )}
                                </strong>

                                <strong class="${
                                    trade.signal === "BUY"
                                        ? "profit"
                                        : "loss"
                                }">
                                    ${escapeHTML(
                                        trade.mode.toUpperCase()
                                    )}
                                </strong>

                            </div>

                            <div class="position-grid">

                                <div>
                                    <small>ENTRY</small>
                                    <strong>
                                        ${formatPrice(
                                            trade.entry
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <small>SL</small>
                                    <strong>
                                        ${formatPrice(
                                            trade.stop
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <small>TP</small>
                                    <strong>
                                        ${formatPrice(
                                            trade.takeProfit
                                        )}
                                    </strong>
                                </div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// =====================================================
// RENDER HISTORY
// =====================================================

function renderActiveModeHistory() {

    const container =
        getElement(
            "tradeHistory"
        );

    const count =
        getElement(
            "historyCount"
        );

    if (!container) {
        return;
    }

    const state =
        getActiveModeState();

    if (count) {

        count.textContent =
            state.tradeHistory.length;

    }

    if (
        state.tradeHistory.length ===
        0
    ) {

        container.innerHTML =
            '<div class="empty-state">No trades recorded yet</div>';

        return;

    }

    container.innerHTML =
        state.tradeHistory
            .map(
                function (trade) {

                    const pnl =
                        safeNumber(
                            trade.profitLoss
                        );

                    return `
                        <div class="history-item">

                            <div class="history-top">

                                <strong>
                                    ${escapeHTML(
                                        trade.symbol
                                    )}
                                    •
                                    ${escapeHTML(
                                        trade.signal
                                    )}
                                </strong>

                                <strong class="${
                                    pnl >= 0
                                        ? "profit"
                                        : "loss"
                                }">

                                    ${
                                        pnl >= 0
                                            ? "+"
                                            : ""
                                    }$${pnl.toFixed(2)}

                                </strong>

                            </div>

                            <div class="history-bottom">

                                <div>
                                    <small>MODE</small>
                                    <strong>
                                        ${escapeHTML(
                                            trade.mode.toUpperCase()
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <small>RISK</small>
                                    <strong>
                                        ${safeNumber(
                                            trade.riskPercent
                                        ).toFixed(2)}%
                                    </strong>
                                </div>

                                <div>
                                    <small>STATUS</small>
                                    <strong>
                                        CLOSED
                                    </strong>
                                </div>

                            </div>

                            <small>
                                ${escapeHTML(
                                    trade.closedAt ||
                                    ""
                                )}
                            </small>

                        </div>
                    `;

                }
            )
            .join("");

}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// MODE-SPECIFIC ANALYSIS
// =====================================================

function analyzeActiveMode() {

    const mode =
        getActiveMode();

    saveActiveModeSettings();

    if (mode === "prop") {

        if (
            !validatePropRules()
        ) {

            showNotification(
                "Prop mode rules are invalid."
            );

            return null;

        }

    }

    const riskCheck =
        checkModeRiskLimits(
            mode
        );

    if (
        !riskCheck.allowed
    ) {

        showNotification(
            mode.toUpperCase() +
            ": " +
            riskCheck.reason
        );

        return null;

    }

    return analyzePCS();

}


// =====================================================
// BALANCE INPUT — MODE ISOLATION
// =====================================================

function handleBalanceChange() {

    const balanceInput =
        getElement("balance");

    if (!balanceInput) {
        return;
    }

    const amount =
        safeNumber(
            balanceInput.value
        );

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    if (!state) {
        return;
    }

    if (
        !state.initialized ||
        state.startingBalance === 0
    ) {

        initializeModeAccount(
            mode,
            amount
        );

        return;

    }

    state.balance =
        amount;

}


// =====================================================
// RISK INPUT CHANGE
// =====================================================

function handleRiskInput() {

    const mode =
        getActiveMode();

    const state =
        modeStates[mode];

    const riskInput =
        getElement("risk");

    if (
        !state ||
        !riskInput
    ) {

        return;

    }

    const risk =
        safeNumber(
            riskInput.value,
            state.riskPerTrade
        );

    if (
        risk >= 0 &&
        risk <= 100
    ) {

        state.riskPerTrade =
            risk;

    }

}


// =====================================================
// PROP INPUT EVENTS
// =====================================================

function initializePropInputs() {

    const inputs = [

        "propMaxDrawdown",
        "propDailyLoss",
        "propProfitTarget"

    ];

    inputs.forEach(
        function (id) {

            const element =
                getElement(id);

            if (!element) {
                return;
            }

            element.addEventListener(
                "input",
                function () {

                    if (
                        getActiveMode() ===
                        "prop"
                    ) {

                        validatePropRules();

                    }

                }
            );

        }
    );

}


// =====================================================
// MODE EVENTS
// =====================================================

function initializeModeEvents() {

    const modeElement =
        getElement(
            "tradingMode"
        );

    if (!modeElement) {
        return;
    }

    modeElement.addEventListener(
        "change",
        function () {

            updateTradingMode();

            renderActiveModePositions();

            renderActiveModeHistory();

            showNotification(
                "Switched to independent " +
                getActiveMode().toUpperCase() +
                " mode."
            );

        }
    );

    updateTradingMode();

}


// =====================================================
// MARKET EVENTS
// =====================================================

function initializeMarketEvents() {

    const marketElement =
        getElement("market");

    const timeframeElement =
        getElement("timeframe");

    if (marketElement) {

        marketElement.addEventListener(
            "change",
            handleMarketChange
        );

    }

    if (timeframeElement) {

        timeframeElement.addEventListener(
            "change",
            handleTimeframeChange
        );

    }

}

// =====================================================
// TRADE SETUP EVENTS
// =====================================================

function initializeTradeSetupEvents() {

    const analyzeButton =
        getElement("analyze");

    const balanceInput =
        getElement("balance");

    const riskInput =
        getElement("risk");

    if (analyzeButton) {

        analyzeButton.addEventListener(
            "click",
            analyzeActiveMode
        );

    }

    if (balanceInput) {

        balanceInput.addEventListener(
            "change",
            handleBalanceChange
        );

    }

    if (riskInput) {

        riskInput.addEventListener(
            "input",
            handleRiskInput
        );

    }

}


// =====================================================
// BACKEND REFRESH LOOP
// =====================================================

function startRefreshLoop() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }

    refreshTimer =
        setInterval(
            async function () {

                await updateRealMarketData();

                await updateScanner();

            },
            PRICE_REFRESH_INTERVAL
        );

}


// =====================================================
// INITIALIZE PCS
// =====================================================

async function initializePCS() {

    console.log(
        "=========================================="
    );

    console.log(
        "PCS AI FRONTEND INITIALIZING"
    );

    console.log(
        "=========================================="
    );

    updateBackendStatus(
        false
    );

    initializeMarketEvents();

    initializeModeEvents();

    initializeTradeSetupEvents();

    initializePropInputs();

    setupEnvironmentButton();

    const health =
        await checkBackend();

    if (!health) {

        showNotification(
            "PCS AI backend is currently unavailable."
        );

        return;

    }

    const marketsLoaded =
        await loadMarkets();

    if (!marketsLoaded) {

        showNotification(
            "Backend online, but markets could not be loaded."
        );

        return;

    }

    await updateRealMarketData();

    await updateScanner();

    startRefreshLoop();

    renderActiveModePositions();

    renderActiveModeHistory();

    showNotification(
        "PCS AI frontend connected successfully."
    );

    console.log(
        "PCS AI frontend initialization complete."
    );

}


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    initializePCS
);


// =====================================================
// PAGE VISIBILITY
// =====================================================

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            updateRealMarketData();

            updateScanner();

        }

    }
);


// =====================================================
// GLOBAL PCS AI API
// =====================================================

window.PCS_AI = {

    backend:
        PCS_BACKEND,

    getSelectedMarket:
        function () {

            return selectedMarket;

        },

    getSelectedTimeframe:
        function () {

            return selectedTimeframe;

        },

    getActiveMode:
        function () {

            return getActiveMode();

        },

    getModeState:
        function (mode) {

            return modeStates[
                mode
            ] || null;

        },

    getAllModeStates:
        function () {

            return modeStates;

        },

    analyze:
        function () {

            return analyzeActiveMode();

        },

    calculateRisk:
        function () {

            return calculateRisk();

        },

    initializeMode:
        function (
            mode,
            balance
        ) {

            if (
                !modeStates[mode]
            ) {

                return false;

            }

            initializeModeAccount(
                mode,
                balance
            );

            return true;

        },

    openVirtualTrade:
        function (
            mode,
            signal,
            entry,
            stop,
            takeProfit,
            positionSize
        ) {

            return registerVirtualTrade(
                mode,
                signal,
                entry,
                stop,
                takeProfit,
                positionSize
            );

        },

    closeVirtualTrade:
        function (
            mode,
            tradeId,
            profitLoss
        ) {

            return closeVirtualTrade(
                mode,
                tradeId,
                profitLoss
            );

        },

    getOpenPositions:
        function (mode) {

            const selected =
                mode ||
                getActiveMode();

            return (
                modeStates[selected]
                    ?.openPositions ||
                []
            );

        },

    getTradeHistory:
        function (mode) {

            const selected =
                mode ||
                getActiveMode();

            return (
                modeStates[selected]
                    ?.tradeHistory ||
                []
            );

        },

    checkRisk:
        function (mode) {

            const selected =
                mode ||
                getActiveMode();

            return checkModeRiskLimits(
                selected
            );

        }

};


// =====================================================
// END OF PCS AI MASTER CONTROLLER
// =====================================================
