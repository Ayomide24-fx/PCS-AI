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
            throw new Error(
                "Backend unavailable"
            );
        }

        const data =
            await response.json();

        console.log(
            "PCS AI Backend:",
            data
        );

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
// LOAD ALL MARKETS FROM BACKEND
// =====================================================

async function loadMarkets() {

    const marketSelect =
        document.getElementById("market");

    if (!marketSelect) {

        console.error(
            "PCS AI: Market selector not found."
        );

        return;

    }


    try {

        const response =
            await fetch(
                PCS_BACKEND + "/api/markets"
            );

        if (!response.ok) {

            throw new Error(
                "Unable to load markets"
            );

        }


        const data =
            await response.json();


        if (!data.categories) {

            throw new Error(
                "Market categories missing from backend."
            );

        }


        // Save current selection

        const currentMarket =
            marketSelect.value ||
            "XAUUSD";


        // Clear existing markets

        marketSelect.innerHTML = "";


        // =================================================
        // CREATE MARKET GROUPS
        // =================================================

        Object.entries(
            data.categories
        ).forEach(
            function ([category, markets]) {

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

                    }
                );


                marketSelect.appendChild(
                    group
                );

            }
        );


        // =================================================
        // UPDATE SELECTED MARKET
        // =================================================

        selectedMarket =
            marketSelect.value ||
            "XAUUSD";


        console.log(
            "PCS AI loaded " +
            data.totalMarkets +
            " markets."
        );


        updateMarketDisplay();

        updateRealMarketData();

    }

    catch (error) {

        console.error(
            "PCS AI market loading failed:",
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
// UPDATE MARKET DATA
// =====================================================

async function updateRealMarketData() {

    const marketElement =
        document.getElementById(
            "market"
        );


    const timeframeElement =
        document.getElementById(
            "timeframe"
        );


    if (
        !marketElement ||
        !timeframeElement
    ) {

        return;

    }


    const market =
        marketElement.value;


    const timeframe =
        timeframeElement.value;


    const price =
        document.getElementById(
            "currentPrice"
        );


    const status =
        document.getElementById(
            "priceStatus"
        );


    if (!price || !status) {

        return;

    }


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
// MARKET CHANGE
// =====================================================

const marketElement =
    document.getElementById("market");


if (marketElement) {

    marketElement.addEventListener(
        "change",
        function () {

            selectedMarket =
                this.value;

            updateMarketDisplay();

            updateRealMarketData();

        }
    );

}


// =====================================================
// TIMEFRAME CHANGE
// =====================================================

const timeframeElement =
    document.getElementById("timeframe");


if (timeframeElement) {

    timeframeElement.addEventListener(
        "change",
        function () {

            selectedTimeframe =
                this.value;

            updateMarketDisplay();

            updateRealMarketData();

        }
    );

}


// =====================================================
// INITIALIZE BACKEND
// =====================================================

window.addEventListener(
    "load",
    async function () {

        await checkBackend();

        await loadMarkets();

    }
);
