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


let riskConfig = {
    ...DEFAULT_RISK_CONFIG
};


// =====================================================
// LIVE MARKET QUOTE ENGINE
// =====================================================

const MARKET_QUOTES = new Map();


const MARKET_QUOTE_MAX_AGE_MS =
    Number(
        process.env.MARKET_QUOTE_MAX_AGE_MS || 15000
    );
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


function normalizeSymbol(symbol) {

    return String(
        symbol || ""
    )
        .trim()
        .toUpperCase();

}


function normalizeTimeframe(timeframe) {

    return String(
        timeframe || "5m"
    )
        .trim()
        .toLowerCase();

}


// =====================================================
// RISK CALCULATIONS
// =====================================================

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


// =====================================================
// POSITION LIMITS
// =====================================================

function getPositionLimit(mode) {

    if (
        mode === "scalper"
    ) {

        return riskConfig
            .scalperMaxPositionsPerPair;

    }

    if (
        mode === "advanced" ||
        mode === "mode3"
    ) {

        return riskConfig
            .advancedMaxPositionsPerPair;

    }

    if (
        mode === "custom" ||
        mode === "mode4"
    ) {

        return riskConfig
            .customMaxPositionsPerPair;

    }

    return riskConfig
        .standardMaxPositionsPerPair;

}


// =====================================================
// MARKET QUOTE STORAGE
// =====================================================

function saveMarketQuote(quote) {

    if (
        !quote ||
        !isValidNumber(
            quote.price
        ) ||
        quote.price <= 0
    ) {

        return false;

    }

    const symbol =
        normalizeSymbol(
            quote.symbol
        );

    const timeframe =
        normalizeTimeframe(
            quote.timeframe
        );


    if (
        !getAllMarkets()
            .includes(symbol)
    ) {

        return false;

    }


    if (
        !TIMEFRAMES
            .includes(timeframe)
    ) {

        return false;

    }


    const now =
        Date.now();


    MARKET_QUOTES.set(
        `${symbol}:${timeframe}`,
        {

            symbol,

            timeframe,

            price:
                Number(
                    quote.price
                ),

            bid:
                isValidNumber(
                    quote.bid
                )
                    ? Number(
                        quote.bid
                    )
                    : null,

            ask:
                isValidNumber(
                    quote.ask
                )
                    ? Number(
                        quote.ask
                    )
                    : null,

            spread:
                isValidNumber(
                    quote.spread
                )
                    ? Number(
                        quote.spread
                    )
                    : null,

            change:
                isValidNumber(
                    quote.change
                )
                    ? Number(
                        quote.change
                    )
                    : null,

            source:
                quote.source ||
                "MT5",

            connection:
                "LIVE",

            timestamp:
                quote.timestamp ||
                new Date(
                    now
                ).toISOString(),

            receivedAt:
                new Date(
                    now
                ).toISOString()

        }
    );


    return true;

}


// =====================================================
// GET MARKET QUOTE
// =====================================================

function getMarketQuote(
    symbol,
    timeframe
) {

    return MARKET_QUOTES.get(
        `${symbol}:${timeframe}`
    ) || null;

}


// =====================================================
// CHECK QUOTE STATUS
// =====================================================

function isQuoteLive(quote) {

    if (
        !quote
    ) {

        return false;

    }


    const age =
        Date.now() -
        new Date(
            quote.receivedAt
        ).getTime();


    return (
        Number.isFinite(age) &&
        age <=
        MARKET_QUOTE_MAX_AGE_MS
    );

}


// =====================================================
// GET QUOTE AGE
// =====================================================

function getQuoteAge(quote) {

    if (
        !quote
    ) {

        return null;

    }


    return (
        Date.now() -
        new Date(
            quote.receivedAt
        ).getTime()
    );

}
// =====================================================
// TELEGRAM NOTIFICATION ENGINE
// =====================================================

async function sendTelegramMessage(message) {

    const token =
        process.env.TELEGRAM_BOT_TOKEN;

    const chatId =
        process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {

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
                        chat_id: chatId,
                        text: message
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
                    data.description ||
                    "Telegram API rejected message"
            };

        }

        return {
            sent: true
        };

    } catch (error) {

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
// ROOT ENDPOINT
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            status: "online",

            system: "PCS AI",

            version:
                SYSTEM_VERSION,

            message:
                "PCS AI Risk & Notification Engine is running"

        });

    }
);


// =====================================================
// HEALTH ENDPOINT
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        let liveQuotes = 0;

        MARKET_QUOTES.forEach(
            function (quote) {

                if (
                    isQuoteLive(
                        quote
                    )
                ) {

                    liveQuotes++;

                }

            }
        );

        res.json({

            status: "online",

            system: "PCS AI",

            version:
                SYSTEM_VERSION,

            marketData:
                liveQuotes > 0
                    ? "live"
                    : "pending",

            liveQuotes:
                liveQuotes,

            tradingView:
                "pending",

            mt5:
                liveQuotes > 0
                    ? "connected"
                    : "pending",

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
// MARKETS ENDPOINT
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

        const results =
            query
                ? getAllMarkets()
                    .filter(
                        symbol =>
                            symbol.includes(
                                query
                            )
                    )
                : [];

        res.json({

            status: "success",

            query:
                query,

            results:
                results

        });

    }
);
// =====================================================
// MT5 MARKET QUOTE INGESTION
// =====================================================

app.post(
    "/api/market/quote",
    (req, res) => {

        const connectorToken =
            process.env.MT5_CONNECTOR_TOKEN;

        const suppliedToken =
            req.headers[
                "x-mt5-connector-token"
            ];

        if (
            !connectorToken ||
            suppliedToken !== connectorToken
        ) {

            return res
                .status(401)
                .json({

                    status: "error",

                    message:
                        "Unauthorized market connector."

                });

        }

        const body =
            req.body || {};

        const symbol =
            normalizeSymbol(
                body.symbol
            );

        const timeframe =
            normalizeTimeframe(
                body.timeframe ||
                "5m"
            );

        if (
            !getAllMarkets()
                .includes(symbol)
        ) {

            return res
                .status(400)
                .json({

                    status: "error",

                    message:
                        "Unsupported market."

                });

        }

        if (
            !TIMEFRAMES
                .includes(timeframe)
        ) {

            return res
                .status(400)
                .json({

                    status: "error",

                    message:
                        "Unsupported timeframe."

                });

        }

        if (
            !isValidNumber(
                body.price
            ) ||
            body.price <= 0
        ) {

            return res
                .status(400)
                .json({

                    status: "error",

                    message:
                        "Invalid market price."

                });

        }

        const saved =
            saveMarketQuote({

                symbol:
                    symbol,

                timeframe:
                    timeframe,

                price:
                    body.price,

                bid:
                    body.bid,

                ask:
                    body.ask,

                spread:
                    body.spread,

                change:
                    body.change,

                source:
                    "MT5",

                timestamp:
                    body.timestamp

            });

        if (!saved) {

            return res
                .status(400)
                .json({

                    status: "error",

                    message:
                        "Unable to save market quote."

                });

        }

        return res.json({

            status: "success",

            message:
                "MT5 market quote received.",

            symbol:
                symbol,

            timeframe:
                timeframe,

            price:
                Number(
                    body.price
                ),

            bid:
                isValidNumber(
                    body.bid
                )
                    ? Number(body.bid)
                    : null,

            ask:
                isValidNumber(
                    body.ask
                )
                    ? Number(body.ask)
                    : null,

            spread:
                isValidNumber(
                    body.spread
                )
                    ? Number(body.spread)
                    : null,

            connection:
                "LIVE"

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
            normalizeSymbol(
                req.query.symbol ||
                "XAUUSD"
            );

        const timeframe =
            normalizeTimeframe(
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

                    status: "error",

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

                    status: "error",

                    message:
                        "Unsupported timeframe"

                });

        }

        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );

        if (!quote) {

            return res.json({

                status:
                    "pending",

                symbol:
                    symbol,

                timeframe:
                    timeframe,

                price:
                    null,

                bid:
                    null,

                ask:
                    null,

                spread:
                    null,

                change:
                    null,

                source:
                    "MT5",

                connection:
                    "CONNECTING",

                message:
                    "Waiting for MT5 market data"

            });

        }

        const age =
            getQuoteAge(
                quote
            );

        if (
            !isQuoteLive(
                quote
            )
        ) {

            return res.json({

                status:
                    "stale",

                symbol:
                    quote.symbol,

                timeframe:
                    quote.timeframe,

                price:
                    quote.price,

                bid:
                    quote.bid,

                ask:
                    quote.ask,

                spread:
                    quote.spread,

                change:
                    quote.change,

                source:
                    quote.source,

                connection:
                    "STALE",

                timestamp:
                    quote.timestamp,

                receivedAt:
                    quote.receivedAt,

                ageMs:
                    age,

                message:
                    "MT5 market quote is stale"

            });

        }

        return res.json({

            status:
                "live",

            symbol:
                quote.symbol,

            timeframe:
                quote.timeframe,

            price:
                quote.price,

            bid:
                quote.bid,

            ask:
                quote.ask,

            spread:
                quote.spread,

            change:
                quote.change,

            source:
                quote.source,

            connection:
                "LIVE",

            timestamp:
                quote.timestamp,

            receivedAt:
                quote.receivedAt,

            ageMs:
                age

        });

    }
);


// =====================================================
// MARKET CONNECTION STATUS
// =====================================================

app.get(
    "/api/market/status",
    (req, res) => {

        const symbol =
            normalizeSymbol(
                req.query.symbol ||
                "XAUUSD"
            );

        const timeframe =
            normalizeTimeframe(
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

                    status: "error",

                    message:
                        "Unsupported market."

                });

        }

        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );

        if (!quote) {

            return res.json({

                status:
                    "connecting",

                symbol:
                    symbol,

                timeframe:
                    timeframe,

                connection:
                    "CONNECTING",

                source:
                    "MT5",

                lastUpdate:
                    null,

                ageMs:
                    null

            });

        }

        const age =
            getQuoteAge(
                quote
            );

        const live =
            isQuoteLive(
                quote
            );

        return res.json({

            status:
                live
                    ? "live"
                    : "stale",

            symbol:
                symbol,

            timeframe:
                timeframe,

            connection:
                live
                    ? "LIVE"
                    : "STALE",

            source:
                quote.source,

            lastUpdate:
                quote.receivedAt,

            ageMs:
                age

        });

    }
);
// =====================================================
// RISK CHECK
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
        // BALANCE VALIDATION
        // -------------------------------------------------

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


        // -------------------------------------------------
        // EQUITY VALIDATION
        // -------------------------------------------------

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


        // -------------------------------------------------
        // SELECT RISK SETTINGS
        // -------------------------------------------------

        const selectedRisk =
            isValidNumber(riskPercent)
                ? riskPercent
                : riskConfig.riskPerTradePercent;


        const maxDD =
            isValidNumber(maxDrawdownPercent)
                ? maxDrawdownPercent
                : riskConfig.maxDrawdownPercent;


        const maxDailyDD =
            isValidNumber(dailyDrawdownPercent)
                ? dailyDrawdownPercent
                : riskConfig.dailyDrawdownPercent;


        // -------------------------------------------------
        // RISK VALIDATION
        // -------------------------------------------------

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

                approved: false,

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
            isValidNumber(dailyLossPercent)
                ? dailyLossPercent
                : 0;


        if (
            currentDailyLoss >= maxDailyDD
        ) {

            await sendTelegramMessage(

                "🚨 PCS AI DAILY RISK LOCK\n\n" +

                "Daily drawdown limit reached.\n\n" +

                `Symbol: ${symbol || "N/A"}\n` +

                `Daily loss: ${currentDailyLoss.toFixed(2)}%\n` +

                `Limit: ${maxDailyDD}%`

            );


            return res.json({

                approved: false,

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
            getPositionLimit(mode);


        if (
            positions >= positionLimit
        ) {

            return res.json({

                approved: false,

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

                approved: false,

                reason:
                    "Stop Loss is required."

            });

        }


        // -------------------------------------------------
        // STOP DISTANCE
        // -------------------------------------------------

        const stopDistance =
            Math.abs(
                entry - stopLoss
            );


        if (
            !isValidNumber(stopDistance) ||
            stopDistance <= 0
        ) {

            return res.json({

                approved: false,

                reason:
                    "Invalid Stop Loss distance."

            });

        }


        // -------------------------------------------------
        // RISK AMOUNT
        // -------------------------------------------------

        const riskAmount =
            calculateRiskAmount(
                balance,
                selectedRisk
            );


        // -------------------------------------------------
        // VALUE PER PRICE MOVE
        // -------------------------------------------------

        if (
            !isValidNumber(
                valuePerPriceMove
            ) ||
            valuePerPriceMove <= 0
        ) {

            return res.json({

                approved: false,

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

        approved: false,

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

        approved: false,

        reason:
            "Calculated lot size exceeds selected risk."

    });

}


// =====================================================
// MARKET VALIDATION
// =====================================================

if (
    symbol &&
    !getAllMarkets().includes(
        normalizeSymbol(symbol)
    )
) {

    return res.json({

        approved: false,

        reason:
            "Unsupported market."

    });

  }
      // =====================================================
// FINAL APPROVAL
// =====================================================

return res.json({

    approved: true,

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

        let liveQuotes = 0;

        MARKET_QUOTES.forEach(
            function (quote) {

                if (
                    isQuoteLive(quote)
                ) {

                    liveQuotes++;

                }

            }
        );

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

            marketData:
                liveQuotes > 0
                    ? "live"
                    : "pending",

            mt5:
                liveQuotes > 0
                    ? "connected"
                    : "pending",

            liveQuotes:
                liveQuotes,

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
// TELEGRAM TEST
// =====================================================

app.get(
    "/api/telegram/test",
    async (req, res) => {

        try {

            const result =
                await sendTelegramMessage(
                    "🤖 PCS AI TEST\n\n" +
                    "Telegram notification system is working.\n\n" +
                    "System: PCS AI\n" +
                    "Status: ONLINE"
                );

            if (!result.sent) {

                return res
                    .status(500)
                    .json({

                        status: "error",

                        message:
                            result.reason

                    });

            }

            return res.json({

                status: "success",

                message:
                    "Telegram notification sent."

            });

        }

        catch (error) {

            console.error(
                "Telegram test error:",
                error
            );

            return res
                .status(500)
                .json({

                    status: "error",

                    message:
                        error.message

                });

        }

    }
);


// =====================================================
// MT5 CONNECTION TEST
// =====================================================

app.get(
    "/api/mt5/status",
    (req, res) => {

        let liveQuotes = 0;

        MARKET_QUOTES.forEach(
            function (quote) {

                if (
                    isQuoteLive(quote)
                ) {

                    liveQuotes++;

                }

            }
        );

        res.json({

            status:
                liveQuotes > 0
                    ? "connected"
                    : "waiting",

            connector:
                process.env.MT5_CONNECTOR_TOKEN
                    ? "configured"
                    : "not_configured",

            liveQuotes:
                liveQuotes,

            quoteAgeLimitMs:
                MARKET_QUOTE_MAX_AGE_MS,

            execution:
                "DEMO ONLY",

            liveTrading:
                false,

            message:
                liveQuotes > 0
                    ? "MT5 market data is being received."
                    : "Waiting for MT5 market data connector."

        });

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                status: "error",

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

        res
            .status(500)
            .json({

                status: "error",

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
            "Market Quote Engine: READY"
        );

        console.log(
            "MT5 Connector: " +
            (
                process.env.MT5_CONNECTOR_TOKEN
                    ? "CONFIGURED"
                    : "WAITING"
            )
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
