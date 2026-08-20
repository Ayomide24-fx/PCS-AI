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
// DOM HELPERS
// =====================================================

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }

}


function setHTML(id, value) {

    const element = getElement(id);

    if (element) {
        element.innerHTML = value;
    }

}


// =====================================================
// BACKEND HEALTH CHECK
// =====================================================

async function checkBackend() {

    try {

        const response = await fetch(
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


        return data;

    }

    catch (error) {

        backendOnline = false;


        console.error(
            "PCS AI backend connection failed:",
            error
        );


        updateBackendStatus(false);


        return null;

    }

}


// =====================================================
// UPDATE BACKEND STATUS
// =====================================================

function updateBackendStatus(isOnline) {

    const statusElement =
        document.querySelector(
            ".status"
        );


    if (!statusElement) {
        return;
    }


    if (isOnline) {

        statusElement.innerHTML =
            '<span></span> ONLINE';

        statusElement.style.color =
            "var(--green)";

    }

    else {

        statusElement.innerHTML =
            '<span></span> OFFLINE';

        statusElement.style.color =
            "var(--red)";

    }

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


                if (group.children.length > 0) {

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

    if (!symbol || !timeframe) {
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


    if (!Number.isFinite(numericPrice)) {

        return String(price);

    }


    if (numericPrice >= 10000) {

        return numericPrice.toFixed(2);

    }


    if (numericPrice >= 1000) {

        return numericPrice.toFixed(2);

    }


    if (numericPrice >= 100) {

        return numericPrice.toFixed(3);

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
        (data.symbol || selectedMarket) +
        " • " +
        (data.timeframe || selectedTimeframe);

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
// TRADING MODE
// =====================================================

function updateTradingMode() {

    const modeElement =
        getElement("tradingMode");


    const infoElement =
        getElement("modeInfo");


    const positionLimit =
        getElement("positionLimit");


    const lotEngine =
        getElement("lotEngine");


    if (!modeElement) {
        return;
    }


    const mode =
        modeElement.value;


    if (mode === "standard") {

        if (infoElement) {

            infoElement.textContent =
                "Standard mode: controlled PCS confirmation with strict risk management.";

        }


        if (positionLimit) {

            positionLimit.textContent =
                "3 / PAIR";

        }


        if (lotEngine) {

            lotEngine.textContent =
                "ADAPTIVE";

        }

    }

    else if (mode === "scalper") {

        if (infoElement) {

            infoElement.textContent =
                "Scalper mode: faster PCS confirmation and controlled position stacking.";

        }


        if (positionLimit) {

            positionLimit.textContent =
                "3 / PAIR";

        }


        if (lotEngine) {

            lotEngine.textContent =
                "ADAPTIVE";

        }

    }

    else if (mode === "mode3") {

        if (infoElement) {

            infoElement.textContent =
                "Advanced mode: reserved for advanced PCS AI configuration.";

        }


        if (positionLimit) {

            positionLimit.textContent =
                "BACKEND";

        }


        if (lotEngine) {

            lotEngine.textContent =
                "AI";

        }

    }

    else if (mode === "mode4") {

        if (infoElement) {

            infoElement.textContent =
                "Custom mode: configuration will be controlled by PCS AI.";

        }


        if (positionLimit) {

            positionLimit.textContent =
                "CUSTOM";

        }


        if (lotEngine) {

            lotEngine.textContent =
                "CUSTOM";

        }

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


    // Safety: frontend remains DEMO.
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

function showNotification(message) {

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
// INITIALIZE MARKET EVENTS
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
// INITIALIZE MODE EVENTS
// =====================================================

function initializeModeEvents() {

    const modeElement =
        getElement("tradingMode");


    if (!modeElement) {
        return;
    }


    modeElement.addEventListener(
        "change",
        updateTradingMode
    );


    updateTradingMode();

}


// =====================================================
// INITIAL MARKET LOAD
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


    updateBackendStatus(false);


    initializeMarketEvents();

    initializeModeEvents();

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
// GLOBAL DEBUG ACCESS
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

    refresh:
        async function () {

            await checkBackend();

            await updateRealMarketData();

            await updateScanner();

        }

};


// =====================================================
// END PCS AI FRONTEND CONTROLLER
// =====================================================
