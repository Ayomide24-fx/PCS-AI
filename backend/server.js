const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const SYSTEM_VERSION = "2.4";


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


// =====================================================
// TIMEFRAMES
// =====================================================

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

    advancedMaxPositionsPerPair: 5,

    customMaxPositionsPerPair: 3,

    requireStopLoss: true,

    adaptiveLotSizing: true,

    liveTradingEnabled: false

};


// =====================================================
// USER RISK CONFIG
// =====================================================

let riskConfig = {
    ...DEFAULT_RISK_CONFIG
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

    if (
        lotStep <= 0
    ) {

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

    return Math.max(
        0,
        (
            (
                balance -
                equity
            ) /
            balance
        ) * 100
    );

}


function getPositionLimit(mode) {

    if (
        mode === "scalper"
    ) {

        return (
            riskConfig
                .scalperMaxPositionsPerPair
        );

    }


    if (
        mode === "advanced" ||
        mode === "mode3"
    ) {

        return (
            riskConfig
                .advancedMaxPositionsPerPair
        );

    }


    if (
        mode === "custom" ||
        mode === "mode4"
    ) {

        return (
            riskConfig
                .customMaxPositionsPerPair
        );

    }


    return (
        riskConfig
            .standardMaxPositionsPerPair
    );

}
// =====================================================
// TELEGRAM
// =====================================================

async function sendTelegramMessage(message) {

    const token =
        process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
        process.env.TELEGRAM_CHAT_ID;


    if (
        !token ||
        !chatId
    ) {

        console.log(
            "Telegram not configured."
        );

        return {

            sent: false,

            reason:
                "Telegram environment variables missing"

        };

    }


    try {

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

                        chat_id:
                            chatId,

                        text:
                            message

                    })

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.ok
        ) {

            console.error(
                "Telegram API error:",
                data
            );

            return {

                sent: false,

                reason:
                    "Telegram API rejected message"

            };

        }


        return {

            sent: true

        };

    }

    catch (error) {

        console.error(
            "Telegram connection error:",
            error
        );

        return {

            sent: false,

            reason:
                error.message

        };

    }

}


// =====================================================
// ROOT
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            message:
                "PCS AI Risk & Notification Engine is running"

        });

    }
);


// =====================================================
// HEALTH
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            marketData:
                "pending",

            tradingView:
                "pending",

            mt5:
                "pending",

            memory:
                "ready",

            tradeHistory:
                "ready",

            riskEngine:
                "ready",

            telegram:
                process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_CHAT_ID
                    ? "configured"
                    : "not_configured",

            tradingExecution:
                riskConfig.liveTradingEnabled
                    ? "enabled"
                    : "disabled"

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

            status:
                "success",

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


        const results =
            query
                ? getAllMarkets()
                    .filter(
                        symbol =>
                            symbol.includes(query)
                    )
                : [];


        res.json({

            status:
                "success",

            query,

            results

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

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported market"

                });

        }


        if (
            !TIMEFRAMES
                .includes(timeframe)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported timeframe"

                });

        }


        res.json({

            status:
                "pending",

            symbol,

            timeframe,

            price:
                null,

            bid:
                null,

            ask:
                null,

            source:
                "pending",

            connection:
                "pending",

            message:
                "Waiting for real market data"

        });

    }
);


// =====================================================
// GET RISK CONFIG
// =====================================================

app.get(
    "/api/risk/config",
    (req, res) => {

        res.json({

            status:
                "success",

            risk: {
                ...riskConfig
            }

        });

    }
);
// =====================================================
// UPDATE RISK CONFIG
// =====================================================

app.post(
    "/api/risk/config",
    (req, res) => {

        const body =
            req.body || {};

        const newConfig = {
            ...riskConfig
        };


        // -------------------------------------------------
        // RISK PER TRADE
        // -------------------------------------------------

        if (
            isValidNumber(
                body.riskPerTradePercent
            )
        ) {

            if (
                body.riskPerTradePercent <= 0 ||
                body.riskPerTradePercent > 100
            ) {

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Risk percentage must be greater than 0 and at most 100."

                    });

            }

            newConfig.riskPerTradePercent =
                body.riskPerTradePercent;

        }


        // -------------------------------------------------
        // MAX DRAW DOWN
        // -------------------------------------------------

        if (
            isValidNumber(
                body.maxDrawdownPercent
            )
        ) {

            if (
                body.maxDrawdownPercent <= 0 ||
                body.maxDrawdownPercent > 100
            ) {

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Maximum drawdown must be between 0 and 100."

                    });

            }

            newConfig.maxDrawdownPercent =
                body.maxDrawdownPercent;

        }


        // -------------------------------------------------
        // DAILY DRAW DOWN
        // -------------------------------------------------

        if (
            isValidNumber(
                body.dailyDrawdownPercent
            )
        ) {

            if (
                body.dailyDrawdownPercent <= 0 ||
                body.dailyDrawdownPercent > 100
            ) {

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Daily drawdown must be between 0 and 100."

                    });

            }

            newConfig.dailyDrawdownPercent =
                body.dailyDrawdownPercent;

        }


        // -------------------------------------------------
        // STANDARD POSITION LIMIT
        // -------------------------------------------------

        if (
            isValidNumber(
                body.standardMaxPositionsPerPair
            )
        ) {

            newConfig.standardMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.standardMaxPositionsPerPair
                    )
                );

        }


        // -------------------------------------------------
        // SCALPER POSITION LIMIT
        // -------------------------------------------------

        if (
            isValidNumber(
                body.scalperMaxPositionsPerPair
            )
        ) {

            newConfig.scalperMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.scalperMaxPositionsPerPair
                    )
                );

        }


        // -------------------------------------------------
        // ADVANCED POSITION LIMIT
        // -------------------------------------------------

        if (
            isValidNumber(
                body.advancedMaxPositionsPerPair
            )
        ) {

            newConfig.advancedMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.advancedMaxPositionsPerPair
                    )
                );

        }


        // -------------------------------------------------
        // CUSTOM POSITION LIMIT
        // -------------------------------------------------

        if (
            isValidNumber(
                body.customMaxPositionsPerPair
            )
        ) {

            newConfig.customMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.customMaxPositionsPerPair
                    )
                );

        }


        // -------------------------------------------------
        // STOP LOSS
        // -------------------------------------------------

        if (
            typeof body.requireStopLoss ===
            "boolean"
        ) {

            newConfig.requireStopLoss =
                body.requireStopLoss;

        }


        // -------------------------------------------------
        // ADAPTIVE LOT SIZING
        // -------------------------------------------------

        if (
            typeof body.adaptiveLotSizing ===
            "boolean"
        ) {

            newConfig.adaptiveLotSizing =
                body.adaptiveLotSizing;

        }


        // -------------------------------------------------
        // SECURITY
        // -------------------------------------------------
        // The public dashboard can never enable
        // live trading execution.

        newConfig.liveTradingEnabled =
            false;


        riskConfig =
            newConfig;


        res.json({

            status:
                "success",

            message:
                "Risk configuration updated.",

            risk: {
                ...riskConfig
            }

        });

    }
);


// =====================================================
// RISK CHECK — START
// =====================================================

app.post(
    "/api/risk/check",
    async (req, res) => {

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


        // -------------------------------------------------
        // BASIC BALANCE VALIDATION
        // -------------------------------------------------

        if (
            !isValidNumber(balance) ||
            balance <= 0
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid account balance."

            });

        }


        // -------------------------------------------------
        // BASIC EQUITY VALIDATION
        // -------------------------------------------------

        if (
            !isValidNumber(equity) ||
            equity <= 0
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid account equity."

            });

        }


        // -------------------------------------------------
        // SELECT RISK SETTINGS
        // -------------------------------------------------

        const selectedRisk =
            isValidNumber(riskPercent)
                ? riskPercent
                : riskConfig
                    .riskPerTradePercent;


        const maxDD =
            isValidNumber(
                maxDrawdownPercent
            )
                ? maxDrawdownPercent
                : riskConfig
                    .maxDrawdownPercent;


        const maxDailyDD =
            isValidNumber(
                dailyDrawdownPercent
            )
                ? dailyDrawdownPercent
                : riskConfig
                    .dailyDrawdownPercent;


        // -------------------------------------------------
        // RISK VALIDATION
        // -------------------------------------------------

        if (
            selectedRisk <= 0 ||
            selectedRisk > 100
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid risk percentage."

            });

        }


        // -------------------------------------------------
        // ACCOUNT DRAWDOWN
        // -------------------------------------------------

        const currentDrawdown =
            getDrawdownPercent(
                balance,
                equity
            );


        if (
            currentDrawdown >= maxDD
        ) {

            await sendTelegramMessage(

                "🚨 PCS AI RISK LOCK\n\n" +

                "Maximum account drawdown reached.\n\n" +

                `Symbol: ${symbol || "N/A"}\n` +

                `Drawdown: ${currentDrawdown.toFixed(2)}%\n` +

                `Limit: ${maxDD}%`

            );


            return res.json({

                approved:
                    false,

                reason:
                    "Maximum account drawdown reached.",

                drawdown:
                    currentDrawdown,

                limit:
                    maxDD

            });

        }


        // -------------------------------------------------
        // DAILY DRAWDOWN
        // -------------------------------------------------

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

            await sendTelegramMessage(

                "🚨 PCS AI DAILY RISK LOCK\n\n" +

                "Daily drawdown limit reached.\n\n" +

                `Symbol: ${symbol || "N/A"}\n` +

                `Daily loss: ${currentDailyLoss.toFixed(2)}%\n` +

                `Limit: ${maxDailyDD}%`

            );


            return res.json({

                approved:
                    false,

                reason:
                    "Maximum daily drawdown reached.",

                dailyDrawdown:
                    currentDailyLoss,

                limit:
                    maxDailyDD

            });

        }


        // -------------------------------------------------
        // POSITION LIMIT
        // -------------------------------------------------

        const positions =
            Number(
                openPositions || 0
            );


        const positionLimit =
            getPositionLimit(
                mode
            );


        if (
            positions >=
            positionLimit
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Maximum positions for this pair reached.",

                positionLimit

            });

        }


        // -------------------------------------------------
        // STOP LOSS REQUIREMENT
        // -------------------------------------------------

        if (
            riskConfig.requireStopLoss &&
            (
                !isValidNumber(entry) ||
                !isValidNumber(stopLoss)
            )
        ) {

            await sendTelegramMessage(

                "⚠️ PCS AI TRADE BLOCKED\n\n" +

                "Stop Loss is required.\n\n" +

                `Symbol: ${symbol || "N/A"}`

            );


            return res.json({

                approved:
                    false,

                reason:
                    "Stop Loss is required."

            });

        }


        // -------------------------------------------------
        // STOP DISTANCE
        // -------------------------------------------------

        const stopDistance =
            Math.abs(
                entry -
                stopLoss
            );


        if (
            !isValidNumber(stopDistance) ||
            stopDistance <= 0
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid Stop Loss distance."

            });

        }
// =====================================================
// RISK AMOUNT
// =====================================================

        const riskAmount =
            calculateRiskAmount(
                balance,
                selectedRisk
            );


// =====================================================
// VALUE PER PRICE MOVE
// =====================================================

        if (
            !isValidNumber(
                valuePerPriceMove
            ) ||
            valuePerPriceMove <= 0
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid value-per-price-move."

            });

        }


// =====================================================
// RAW LOT CALCULATION
// =====================================================

        const rawLot =
            calculateRawLot(
                riskAmount,
                stopDistance,
                valuePerPriceMove
            );


        if (
            !isValidNumber(rawLot) ||
            rawLot <= 0
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Unable to calculate a valid lot size."

            });

        }


// =====================================================
// LOT LIMITS
// =====================================================

        const minimumLot =
            isValidNumber(minLot)
                ? minLot
                : 0.01;


        const maximumLot =
            isValidNumber(maxLot)
                ? maxLot
                : 100;


        const minimumLotStep =
            isValidNumber(lotStep) &&
            lotStep > 0
                ? lotStep
                : 0.01;


// =====================================================
// ADAPTIVE LOT SIZING
// =====================================================

        let calculatedLot =
            rawLot;


        if (
            riskConfig.adaptiveLotSizing
        ) {

            calculatedLot =
                Math.min(
                    rawLot,
                    maximumLot
                );

        }


// =====================================================
// ROUND LOT
// =====================================================

        calculatedLot =
            roundLot(
                calculatedLot,
                minimumLotStep
            );


// =====================================================
// MINIMUM LOT CHECK
// =====================================================

        if (
            calculatedLot <
            minimumLot
        ) {

            calculatedLot =
                minimumLot;

        }


// =====================================================
// MAXIMUM LOT CHECK
// =====================================================

        if (
            calculatedLot >
            maximumLot
        ) {

            calculatedLot =
                maximumLot;

        }


// =====================================================
// FINAL RISK CALCULATION
// =====================================================

        const estimatedRisk =
            calculatedLot *
            stopDistance *
            valuePerPriceMove;


        const estimatedRiskPercent =
            balance > 0
                ? (
                    estimatedRisk /
                    balance
                ) * 100
                : 0;


// =====================================================
// FINAL SECURITY CHECK
// =====================================================

        if (
            estimatedRiskPercent >
            selectedRisk
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Calculated lot size exceeds selected risk."

            });

        }


// =====================================================
// MARKET VALIDATION
// =====================================================

        if (
            symbol &&
            !getAllMarkets()
                .includes(
                    String(symbol)
                        .toUpperCase()
                )
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Unsupported market."

            });

        }


// =====================================================
// FINAL APPROVAL
// =====================================================

        return res.json({

            approved:
                true,

            status:
                "PCS RISK APPROVED",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            symbol:
                symbol || null,

            mode:
                mode || "standard",

            balance:
                balance,

            equity:
                equity,

            riskPercent:
                selectedRisk,

            riskAmount:
                Number(
                    riskAmount.toFixed(2)
                ),

            drawdownPercent:
                Number(
                    currentDrawdown.toFixed(2)
                ),

            dailyLossPercent:
                Number(
                    currentDailyLoss.toFixed(2)
                ),

            stopDistance:
                Number(
                    stopDistance.toFixed(5)
                ),

            rawLot:
                Number(
                    rawLot.toFixed(5)
                ),

            lotSize:
                Number(
                    calculatedLot.toFixed(5)
                ),

            estimatedRisk:
                Number(
                    estimatedRisk.toFixed(2)
                ),

            estimatedRiskPercent:
                Number(
                    estimatedRiskPercent.toFixed(2)
                ),

            positionLimit:
                positionLimit,

            openPositions:
                positions,

            stopLossRequired:
                riskConfig.requireStopLoss,

            liveTradingEnabled:
                false,

            message:
                "Trade passed PCS AI risk checks. Live execution remains disabled."

        });

    }
);


// =====================================================
// SYSTEM INFO
// =====================================================

app.get(
    "/api/system",
    (req, res) => {

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            engine:
                "Risk & Notification Engine",

            markets:
                getAllMarkets().length,

            timeframes:
                TIMEFRAMES.length,

            riskEngine:
                "ready",

            telegram:
                process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_CHAT_ID
                    ? "configured"
                    : "not_configured",

            liveTrading:
                "disabled",

            message:
                "PCS AI backend is operational."

        });

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        res.status(404)
            .json({

                status:
                    "error",

                message:
                    "PCS AI endpoint not found.",

                path:
                    req.originalUrl

            });

    }
);


// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "PCS AI SERVER ERROR:",
            error
        );


        res.status(500)
            .json({

                status:
                    "error",

                message:
                    "Internal PCS AI server error."

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
            "=========================================="
        );

        console.log(
            "        PCS AI BACKEND ONLINE"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Version: ${SYSTEM_VERSION}`
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Markets: ${getAllMarkets().length}`
        );

        console.log(
            `Timeframes: ${TIMEFRAMES.length}`
        );

        console.log(
            "Risk Engine: READY"
        );

        console.log(
            "Telegram: " +
            (
                process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_CHAT_ID
                    ? "CONFIGURED"
                    : "NOT CONFIGURED"
            )
        );

        console.log(
            "Live Trading: DISABLED"
        );

        console.log(
            "=========================================="
        );

    }
);
