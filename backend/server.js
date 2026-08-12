const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const SYSTEM_VERSION = "2.3";


// =====================================================
// MARKET DATABASE
// =====================================================

const MARKET_CATEGORIES = {

    forex: [
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "USDCHF",
        "AUDUSD",
        "USDCAD",
        "NZDUSD",
        "EURGBP",
        "EURJPY",
        "GBPJPY"
    ],

    metals: [
        "XAUUSD",
        "XAGUSD"
    ],

    crypto: [
        "BTCUSD",
        "ETHUSD",
        "XRPUSD",
        "LTCUSD"
    ],

    indices: [
        "NAS100",
        "US30",
        "SPX500",
        "GER40",
        "UK100"
    ],

    synthetic: [
        "V10",
        "V25",
        "V50",
        "V75",
        "V100",
        "V10_1S",
        "V25_1S",
        "V50_1S",
        "V75_1S",
        "V100_1S"
    ]

};


const TIMEFRAMES = [
    "1m",
    "5m",
    "15m",
    "30m",
    "1h",
    "4h",
    "1d"
];


// =====================================================
// DEFAULT RISK CONFIGURATION
// =====================================================

const DEFAULT_RISK_CONFIG = {

    riskPerTradePercent: 1,

    maxDrawdownPercent: 10,

    dailyDrawdownPercent: 5,

    standardMaxPositionsPerPair: 3,

    scalperMaxPositionsPerPair: 10,

    requireStopLoss: true,

    adaptiveLotSizing: true,

    liveTradingEnabled: false

};


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getAllMarkets() {

    return Object.values(
        MARKET_CATEGORIES
    ).flat();

}


function isValidNumber(value) {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


function calculateRiskAmount(
    balance,
    riskPercent
) {

    return (
        balance *
        riskPercent /
        100
    );

}


function calculateRawLot(
    riskAmount,
    stopDistance,
    valuePerPriceMove
) {

    if (
        riskAmount <= 0 ||
        stopDistance <= 0 ||
        valuePerPriceMove <= 0
    ) {

        return 0;

    }


    return (
        riskAmount /
        (
            stopDistance *
            valuePerPriceMove
        )
    );

}


function roundLot(
    lot,
    lotStep
) {

    if (lotStep <= 0) {

        return lot;

    }


    return (
        Math.floor(
            lot / lotStep
        ) * lotStep
    );

}


function getDrawdownPercent(
    balance,
    equity
) {

    if (
        balance <= 0
    ) {

        return 0;

    }


    return (
        (
            balance -
            equity
        ) /
        balance
    ) * 100;

}


// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {

    res.json({

        status: "online",

        system: "PCS AI",

        version: SYSTEM_VERSION,

        message:
            "PCS AI Risk Engine is running"

    });

});


// =====================================================
// HEALTH
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status: "online",

            system: "PCS AI",

            version: SYSTEM_VERSION,

            marketData: "pending",

            tradingView: "pending",

            mt5: "pending",

            memory: "ready",

            tradeHistory: "ready",

            riskEngine: "ready",

            tradingExecution: "disabled"

        });

    }
);


// =====================================================
// MARKETS
// =====================================================

app.get(
    "/api/markets",
    (req, res) => {

        res.json({

            status: "success",

            categories:
                MARKET_CATEGORIES,

            timeframes:
                TIMEFRAMES,

            totalMarkets:
                getAllMarkets().length

        });

    }
);


// =====================================================
// MARKET SEARCH
// =====================================================

app.get(
    "/api/markets/search",
    (req, res) => {

        const query =
            String(
                req.query.q || ""
            )
            .trim()
            .toUpperCase();


        if (!query) {

            return res.json({

                status: "success",

                query: "",

                results: []

            });

        }


        const results =
            getAllMarkets()
                .filter(
                    symbol =>
                        symbol.includes(query)
                );


        res.json({

            status: "success",

            query: query,

            results: results

        });

    }
);


// =====================================================
// MARKET DATA
// =====================================================

app.get(
    "/api/market",
    (req, res) => {

        const symbol =
            String(
                req.query.symbol ||
                "XAUUSD"
            )
            .toUpperCase();


        const timeframe =
            String(
                req.query.timeframe ||
                "5m"
            );


        if (
            !getAllMarkets()
                .includes(symbol)
        ) {

            return res.status(400)
                .json({

                    status: "error",

                    message:
                        "Unsupported market"

                });

        }


        if (
            !TIMEFRAMES
                .includes(timeframe)
        ) {

            return res.status(400)
                .json({

                    status: "error",

                    message:
                        "Unsupported timeframe"

                });

        }


        res.json({

            status: "pending",

            symbol,

            timeframe,

            price: null,

            bid: null,

            ask: null,

            source: "pending",

            connection: "pending",

            message:
                "Waiting for real market data"

        });

    }
);


// =====================================================
// RISK CONFIG
// =====================================================

app.get(
    "/api/risk/config",
    (req, res) => {

        res.json({

            status: "success",

            risk:
                DEFAULT_RISK_CONFIG

        });

    }
);


// =====================================================
// RISK CHECK
// =====================================================

app.post(
    "/api/risk/check",
    (req, res) => {

        const {

            balance,

            equity,

            riskPercent,

            maxDrawdownPercent,

            dailyDrawdownPercent,

            dailyLossPercent,

            symbol,

            mode,

            openPositions,

            entry,

            stopLoss,

            valuePerPriceMove,

            minLot,

            maxLot,

            lotStep

        } = req.body;


        // ---------------------------------------------
        // BASIC VALIDATION
        // ---------------------------------------------

        if (
            !isValidNumber(balance) ||
            balance <= 0
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid account balance."

            });

        }


        if (
            !isValidNumber(equity) ||
            equity <= 0
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid account equity."

            });

        }


        const selectedRisk =
            isValidNumber(riskPercent)
                ? riskPercent
                : DEFAULT_RISK_CONFIG
                    .riskPerTradePercent;


        const maxDD =
            isValidNumber(
                maxDrawdownPercent
            )
                ? maxDrawdownPercent
                : DEFAULT_RISK_CONFIG
                    .maxDrawdownPercent;


        const maxDailyDD =
            isValidNumber(
                dailyDrawdownPercent
            )
                ? dailyDrawdownPercent
                : DEFAULT_RISK_CONFIG
                    .dailyDrawdownPercent;


        // ---------------------------------------------
        // RISK PERCENT VALIDATION
        // ---------------------------------------------

        if (
            selectedRisk <= 0 ||
            selectedRisk > 100
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid risk percentage."

            });

        }


        // ---------------------------------------------
        // ACCOUNT DRAWDOWN
        // ---------------------------------------------

        const currentDrawdown =
            getDrawdownPercent(
                balance,
                equity
            );


        if (
            currentDrawdown >= maxDD
        ) {

            return res.json({

                approved: false,

                reason:
                    "Maximum account drawdown reached.",

                drawdown:
                    currentDrawdown

            });

        }


        // ---------------------------------------------
        // DAILY DRAWDOWN
        // ---------------------------------------------

        const currentDailyLoss =
            isValidNumber(
                dailyLossPercent
            )
                ? dailyLossPercent
                : 0;


        if (
            currentDailyLoss >=
            maxDailyDD
        ) {

            return res.json({

                approved: false,

                reason:
                    "Maximum daily drawdown reached.",

                dailyDrawdown:
                    currentDailyLoss

            });

        }


        // ---------------------------------------------
        // POSITION LIMIT
        // ---------------------------------------------

        const positions =
            Number(
                openPositions || 0
            );


        const positionLimit =
            mode === "standard"
                ? DEFAULT_RISK_CONFIG
                    .standardMaxPositionsPerPair
                : DEFAULT_RISK_CONFIG
                    .scalperMaxPositionsPerPair;


        if (
            positions >=
            positionLimit
        ) {

            return res.json({

                approved: false,

                reason:
                    "Maximum positions for this pair reached.",

                positionLimit

            });

        }


        // ---------------------------------------------
        // STOP LOSS
        // ---------------------------------------------

        if (
            DEFAULT_RISK_CONFIG
                .requireStopLoss &&
            (
                !isValidNumber(entry) ||
                !isValidNumber(stopLoss)
            )
        ) {

            return res.json({

                approved: false,

                reason:
                    "Stop Loss is required."

            });

        }


        const stopDistance =
            Math.abs(
                entry -
                stopLoss
            );


        if (
            stopDistance <= 0
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid Stop Loss distance."

            });

        }


        // ---------------------------------------------
        // RISK AMOUNT
        // ---------------------------------------------

        const riskAmount =
            calculateRiskAmount(
                balance,
                selectedRisk
            );


        // ---------------------------------------------
        // LOT CALCULATION
        // ---------------------------------------------

        if (
            !isValidNumber(
                valuePerPriceMove
            ) ||
            valuePerPriceMove <= 0
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid value-per-price-move specification."

            });

        }


        const rawLot =
            calculateRawLot(
                riskAmount,
                stopDistance,
                valuePerPriceMove
            );


        const minimumLot =
            isValidNumber(minLot)
                ? minLot
                : 0.01;


        const maximumLot =
            isValidNumber(maxLot)
                ? maxLot
                : 100;


        const step =
            isValidNumber(lotStep)
                ? lotStep
                : 0.01;


        const calculatedLot =
            roundLot(
                rawLot,
                step
            );


        // ---------------------------------------------
        // MINIMUM LOT SAFETY
        // ---------------------------------------------

        if (
            calculatedLot <
            minimumLot
        ) {

            return res.json({

                approved: false,

                reason:
                    "Minimum broker lot would exceed the requested risk.",

                riskAmount,

                rawLot,

                minimumLot

            });

        }


        // ---------------------------------------------
        // MAXIMUM LOT SAFETY
        // ---------------------------------------------

        if (
            calculatedLot >
            maximumLot
        ) {

            return res.json({

                approved: false,

                reason:
                    "Calculated lot exceeds broker maximum.",

                calculatedLot,

                maximumLot

            });

        }


        // ---------------------------------------------
        // FINAL APPROVAL
        // ---------------------------------------------

        res.json({

            approved: true,

            symbol:
                symbol || null,

            mode:
                mode || "standard",

            balance,

            equity,

            riskPercent:
                selectedRisk,

            riskAmount:
                Number(
                    riskAmount.toFixed(2)
                ),

            currentDrawdown:
                Number(
                    currentDrawdown
                        .toFixed(2)
                ),

            dailyDrawdown:
                Number(
                    currentDailyLoss
                        .toFixed(2)
                ),

            entry,

            stopLoss,

            stopDistance,

            lot:
                Number(
                    calculatedLot
                        .toFixed(4)
                ),

            positionLimit,

            execution: {

                enabled: false,

                environment: "demo"

            }

        });

    }
);


// =====================================================
// PCS SIGNAL
// =====================================================

app.post(
    "/api/signal",
    (req, res) => {

        const {

            symbol,

            timeframe,

            direction,

            confidence,

            entry,

            stopLoss,

            takeProfit

        } = req.body;


        res.json({

            status: "received",

            signal: {

                symbol:
                    symbol || null,

                timeframe:
                    timeframe || null,

                direction:
                    direction || "WAIT",

                confidence:
                    Number(confidence) || 0,

                entry:
                    entry !== undefined
                        ? Number(entry)
                        : null,

                stopLoss:
                    stopLoss !== undefined
                        ? Number(stopLoss)
                        : null,

                takeProfit:
                    takeProfit !== undefined
                        ? Number(takeProfit)
                        : null

            },

            execution: {

                enabled: false,

                environment: "demo"

            }

        });

    }
);


// =====================================================
// ANALYSIS STATUS
// =====================================================

app.get(
    "/api/analysis/status",
    (req, res) => {

        res.json({

            status: "online",

            engine: "PCS AI",

            heikinAshi: "ready",

            dojiConfirmation: "ready",

            marketStructure: "ready",

            supportResistance: "ready",

            confidenceEngine: "ready",

            tradingView: "pending"

        });

    }
);


// =====================================================
// TRADING STATUS
// =====================================================

app.get(
    "/api/trading/status",
    (req, res) => {

        res.json({

            status: "online",

            demoTrading: true,

            liveTrading: false,

            mt5: "pending",

            execution: "disabled",

            standardMode: {

                maxPositionsPerPair: 3

            },

            scalperMode: {

                maxPositionsPerPair: 10

            },

            adaptiveLotSizing:
                "ready",

            riskEngine:
                "ready"

        });

    }
);


// =====================================================
// TRADE HISTORY
// =====================================================

app.get(
    "/api/trades/history",
    (req, res) => {

        res.json({

            status: "success",

            count: 0,

            trades: []

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `PCS AI backend v${SYSTEM_VERSION} running on port ${PORT}`
        );

    }
);
// =====================================================
// TELEGRAM NOTIFICATION TEST
// =====================================================

app.get("/api/telegram/test", async (req, res) => {

    try {

        const token =
            process.env.TELEGRAM_BOT_TOKEN;

        const chatId =
            process.env.TELEGRAM_CHAT_ID;


        if (!token || !chatId) {

            return res.status(500).json({

                status: "error",

                message:
                    "Telegram environment variables are missing"

            });

        }


        const message =
            "🤖 PCS AI\n\n" +
            "✅ Telegram connection successful!\n\n" +
            "PCS AI notification system is online.";


        const response =
            await fetch(
                `https://api.telegram.org/bot${token}/sendMessage`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        chat_id: chatId,

                        text: message

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.ok) {

            return res.status(500).json({

                status: "error",

                telegram: data

            });

        }


        res.json({

            status: "success",

            message:
                "Telegram notification sent"

        });

    }

    catch (error) {

        console.error(
            "Telegram error:",
            error
        );


        res.status(500).json({

            status: "error",

            message:
                "Telegram connection failed"

        });

    }

});
