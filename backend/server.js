const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SYSTEM_VERSION = "3.1";

// =====================================================
// PCS AI MARKET DATABASE
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
// PCS AI TIMEFRAMES
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
// PCS AI MODES
// =====================================================

const PCS_MODES = [
    "standard",
    "scalper",
    "compounding",
    "prop"
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
    compoundingMaxPositionsPerPair: 5,
    propMaxPositionsPerPair: 3,

    requireStopLoss: true,
    adaptiveLotSizing: true,

    liveTradingEnabled: false
};

let riskConfig = {
    ...DEFAULT_RISK_CONFIG
};

// =====================================================
// MARKET QUOTE ENGINE
// =====================================================

const MARKET_QUOTES = new Map();

const MARKET_QUOTE_MAX_AGE_MS = Number(
    process.env.MARKET_QUOTE_MAX_AGE_MS || 15000
);

// =====================================================
// MT5 CONNECTION STATE
// =====================================================

const MT5_STATE = {
    connected: false,
    lastHeartbeat: null,
    lastQuote: null,
    connector: "MT5",
    execution: "DEMO ONLY",
    liveTrading: false
};

// =====================================================
// PCS AI SESSION STATE
// =====================================================

const SYSTEM_STATE = {
    startedAt: new Date().toISOString(),
    requests: 0,
    marketRequests: 0,
    riskRequests: 0,
    quoteRequests: 0
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getAllMarkets() {
    return Object.values(MARKET_CATEGORIES).flat();
}

function isValidNumber(value) {
    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );
}

function normalizeSymbol(symbol) {
    return String(symbol || "")
        .trim()
        .toUpperCase();
}

function normalizeTimeframe(timeframe) {
    return String(timeframe || "5m")
        .trim()
        .toLowerCase();
}

function normalizeMode(mode) {
    const normalized = String(mode || "standard")
        .trim()
        .toLowerCase();

    return PCS_MODES.includes(normalized)
        ? normalized
        : "standard";
}

function isSupportedMarket(symbol) {
    return getAllMarkets().includes(
        normalizeSymbol(symbol)
    );
}

function isSupportedTimeframe(timeframe) {
    return TIMEFRAMES.includes(
        normalizeTimeframe(timeframe)
    );
}

function isSupportedMode(mode) {
    return PCS_MODES.includes(
        normalizeMode(mode)
    );
}

// =====================================================
// REQUEST COUNTER
// =====================================================

app.use(function (req, res, next) {
    SYSTEM_STATE.requests++;
    next();
});

// =====================================================
// RISK CALCULATIONS
// =====================================================

function calculateRiskAmount(balance, riskPercent) {
    return balance * riskPercent / 100;
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

    return riskAmount / (
        stopDistance * valuePerPriceMove
    );
}

function roundLot(lot, lotStep) {
    if (lotStep <= 0) {
        return lot;
    }

    return Math.floor(lot / lotStep) * lotStep;
}

function getDrawdownPercent(balance, equity) {
    if (balance <= 0) {
        return 0;
    }

    return Math.max(
        0,
        ((balance - equity) / balance) * 100
    );
}

// =====================================================
// POSITION LIMITS
// =====================================================

function getPositionLimit(mode) {
    const normalizedMode = normalizeMode(mode);

    if (normalizedMode === "scalper") {
        return riskConfig.scalperMaxPositionsPerPair;
    }

    if (normalizedMode === "compounding") {
        return riskConfig.compoundingMaxPositionsPerPair;
    }

    if (normalizedMode === "prop") {
        return riskConfig.propMaxPositionsPerPair;
    }

    return riskConfig.standardMaxPositionsPerPair;
}

// =====================================================
// MARKET QUOTE STORAGE
// =====================================================

function saveMarketQuote(quote) {
    if (
        !quote ||
        !isValidNumber(quote.price) ||
        quote.price <= 0
    ) {
        return false;
    }

    const symbol = normalizeSymbol(quote.symbol);
    const timeframe = normalizeTimeframe(quote.timeframe);

    if (!isSupportedMarket(symbol)) {
        return false;
    }

    if (!isSupportedTimeframe(timeframe)) {
        return false;
    }

    const now = Date.now();
    const receivedAt = new Date(now).toISOString();

    MARKET_QUOTES.set(
        `${symbol}:${timeframe}`,
        {
            symbol,
            timeframe,
            price: Number(quote.price),

            bid: isValidNumber(quote.bid)
                ? Number(quote.bid)
                : null,

            ask: isValidNumber(quote.ask)
                ? Number(quote.ask)
                : null,

            spread: isValidNumber(quote.spread)
                ? Number(quote.spread)
                : null,

            change: isValidNumber(quote.change)
                ? Number(quote.change)
                : null,

            source: quote.source || "MT5",

            connection: "LIVE",

            timestamp:
                quote.timestamp || receivedAt,

            receivedAt
        }
    );

    MT5_STATE.connected = true;
    MT5_STATE.lastQuote = receivedAt;
    MT5_STATE.lastHeartbeat = receivedAt;

    SYSTEM_STATE.quoteRequests++;

    return true;
}

// =====================================================
// GET MARKET QUOTE
// =====================================================

function getMarketQuote(symbol, timeframe) {
    return MARKET_QUOTES.get(
        `${normalizeSymbol(symbol)}:${normalizeTimeframe(timeframe)}`
    ) || null;
}

// =====================================================
// CHECK QUOTE STATUS
// =====================================================

function isQuoteLive(quote) {
    if (!quote) {
        return false;
    }

    const receivedTime =
        new Date(quote.receivedAt).getTime();

    if (!Number.isFinite(receivedTime)) {
        return false;
    }

    const age = Date.now() - receivedTime;

    return (
        age >= 0 &&
        age <= MARKET_QUOTE_MAX_AGE_MS
    );
}

// =====================================================
// GET QUOTE AGE
// =====================================================

function getQuoteAge(quote) {
    if (!quote) {
        return null;
    }

    const receivedTime =
        new Date(quote.receivedAt).getTime();

    if (!Number.isFinite(receivedTime)) {
        return null;
    }

    return Date.now() - receivedTime;
  }

// =====================================================
// UPDATE MT5 CONNECTION STATE
// =====================================================

function updateMT5ConnectionState() {
    let liveQuotes = 0;

    MARKET_QUOTES.forEach(function (quote) {
        if (isQuoteLive(quote)) {
            liveQuotes++;
        }
    });

    MT5_STATE.connected = liveQuotes > 0;

    if (liveQuotes === 0) {
        MT5_STATE.execution = "DEMO ONLY";
    }

    return liveQuotes;
}

// =====================================================
// TELEGRAM NOTIFICATION ENGINE
// =====================================================

async function sendTelegramMessage(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log("Telegram not configured.");

        return {
            sent: false,
            reason: "Telegram environment variables missing"
        };
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    chat_id: chatId,
                    text: String(message)
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
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
            reason: error.message
        };
    }
}

// =====================================================
// ROOT ENDPOINT
// =====================================================

app.get("/", function (req, res) {
    res.json({
        status: "online",
        system: "PCS AI",
        version: SYSTEM_VERSION,
        message: "PCS AI backend is running.",
        liveTrading: false
    });
});

// =====================================================
// HEALTH ENDPOINT
// =====================================================

app.get("/api/health", function (req, res) {
    const liveQuotes =
        updateMT5ConnectionState();

    res.json({
        status: "online",
        system: "PCS AI",
        version: SYSTEM_VERSION,

        marketData:
            liveQuotes > 0
                ? "live"
                : "pending",

        liveQuotes,

        tradingView: "pending",

        mt5:
            liveQuotes > 0
                ? "connected"
                : "pending",

        memory: "ready",
        tradeHistory: "ready",
        riskEngine: "ready",

        telegram:
            process.env.TELEGRAM_BOT_TOKEN &&
            process.env.TELEGRAM_CHAT_ID
                ? "configured"
                : "not_configured",

        tradingExecution: "disabled"
    });
});

// =====================================================
// SYSTEM INFORMATION
// =====================================================

app.get("/api/system", function (req, res) {
    const liveQuotes =
        updateMT5ConnectionState();

    res.json({
        status: "online",
        system: "PCS AI",
        version: SYSTEM_VERSION,

        engine:
            "PCS AI Backend Foundation",

        markets:
            getAllMarkets().length,

        timeframes:
            TIMEFRAMES.length,

        modes:
            PCS_MODES,

        riskEngine: "ready",

        marketData:
            liveQuotes > 0
                ? "live"
                : "pending",

        mt5:
            liveQuotes > 0
                ? "connected"
                : "pending",

        liveQuotes,

        telegram:
            process.env.TELEGRAM_BOT_TOKEN &&
            process.env.TELEGRAM_CHAT_ID
                ? "configured"
                : "not_configured",

        liveTrading: "disabled",

        startedAt:
            SYSTEM_STATE.startedAt,

        requests:
            SYSTEM_STATE.requests,

        marketRequests:
            SYSTEM_STATE.marketRequests,

        riskRequests:
            SYSTEM_STATE.riskRequests,

        quoteRequests:
            SYSTEM_STATE.quoteRequests,

        message:
            "PCS AI backend foundation is operational."
    });
});

// =====================================================
// MODES ENDPOINT
// =====================================================

app.get("/api/modes", function (req, res) {
    res.json({
        status: "success",
        modes: PCS_MODES
    });
});

// =====================================================
// MARKETS ENDPOINT
// =====================================================

app.get("/api/markets", function (req, res) {
    SYSTEM_STATE.marketRequests++;

    res.json({
        status: "success",

        categories:
            MARKET_CATEGORIES,

        timeframes:
            TIMEFRAMES,

        totalMarkets:
            getAllMarkets().length
    });
});

// =====================================================
// MARKET SEARCH
// =====================================================

app.get(
    "/api/markets/search",
    function (req, res) {
        const query = String(
            req.query.q || ""
        )
            .trim()
            .toUpperCase();

        const results = query
            ? getAllMarkets().filter(
                function (symbol) {
                    return symbol.includes(query);
                }
            )
            : [];

        res.json({
            status: "success",
            query,
            results
        });
    }
);

// =====================================================
// RISK CONFIGURATION — GET
// =====================================================

app.get(
    "/api/risk/config",
    function (req, res) {
        res.json({
            status: "success",

            risk: {
                ...riskConfig
            }
        });
    }
);

// =====================================================
// RISK CONFIGURATION — POST
// =====================================================

app.post(
    "/api/risk/config",
    function (req, res) {
        const body = req.body || {};
        const newConfig = {
            ...riskConfig
        };

        if (
            isValidNumber(
                body.riskPerTradePercent
            )
        ) {
            if (
                body.riskPerTradePercent <= 0 ||
                body.riskPerTradePercent > 100
            ) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "Risk percentage must be greater than 0 and at most 100."
                });
            }

            newConfig.riskPerTradePercent =
                body.riskPerTradePercent;
        }

        if (
            isValidNumber(
                body.maxDrawdownPercent
            )
        ) {
            if (
                body.maxDrawdownPercent <= 0 ||
                body.maxDrawdownPercent > 100
            ) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "Maximum drawdown must be between 0 and 100."
                });
            }

            newConfig.maxDrawdownPercent =
                body.maxDrawdownPercent;
        }

        if (
            isValidNumber(
                body.dailyDrawdownPercent
            )
        ) {
            if (
                body.dailyDrawdownPercent <= 0 ||
                body.dailyDrawdownPercent > 100
            ) {
                return res.status(400).json({
                    status: "error",
                    message:
                        "Daily drawdown must be between 0 and 100."
                });
            }

            newConfig.dailyDrawdownPercent =
                body.dailyDrawdownPercent;
        }

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

        if (
            isValidNumber(
                body.compoundingMaxPositionsPerPair
            )
        ) {
            newConfig.compoundingMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.compoundingMaxPositionsPerPair
                    )
                );
        }

        if (
            isValidNumber(
                body.propMaxPositionsPerPair
            )
        ) {
            newConfig.propMaxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.propMaxPositionsPerPair
                    )
                );
        }

        if (
            typeof body.requireStopLoss ===
            "boolean"
        ) {
            newConfig.requireStopLoss =
                body.requireStopLoss;
        }

        if (
            typeof body.adaptiveLotSizing ===
            "boolean"
        ) {
            newConfig.adaptiveLotSizing =
                body.adaptiveLotSizing;
        }

        newConfig.liveTradingEnabled = false;

        riskConfig = newConfig;

        return res.json({
            status: "success",

            message:
                "Risk configuration updated.",

            risk: {
                ...riskConfig
            }
        });
    }
);

// =====================================================
// RISK CHECK ENGINE
// =====================================================

app.post(
    "/api/risk/check",
    async function (req, res) {
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

        SYSTEM_STATE.riskRequests++;

        // =================================================
        // BALANCE VALIDATION
        // =================================================

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

        // =================================================
        // EQUITY VALIDATION
        // =================================================

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

        // =================================================
        // MODE
        // =================================================

        const selectedMode =
            normalizeMode(mode);

        // =================================================
        // SELECT RISK SETTINGS
        // =================================================

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

        // =================================================
        // RISK VALIDATION
        // =================================================

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

  // =================================================
        // ACCOUNT DRAWDOWN
        // =================================================

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
                `Mode: ${selectedMode}\n` +
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

        // =================================================
        // DAILY DRAWDOWN
        // =================================================

        const currentDailyLoss =
            isValidNumber(
                dailyLossPercent
            )
                ? dailyLossPercent
                : 0;

        if (
            currentDailyLoss >= maxDailyDD
        ) {
            await sendTelegramMessage(
                "🚨 PCS AI DAILY RISK LOCK\n\n" +
                "Daily drawdown limit reached.\n\n" +
                `Symbol: ${symbol || "N/A"}\n` +
                `Mode: ${selectedMode}\n` +
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

        // =================================================
        // POSITION LIMIT
        // =================================================

        const positions =
            Number(openPositions || 0);

        const positionLimit =
            getPositionLimit(
                selectedMode
            );

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

        // =================================================
        // STOP LOSS REQUIREMENT
        // =================================================

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
                `Symbol: ${symbol || "N/A"}\n` +
                `Mode: ${selectedMode}`
            );

            return res.json({
                approved: false,

                reason:
                    "Stop Loss is required."
            });
        }

        // =================================================
        // STOP DISTANCE
        // =================================================

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

        // =================================================
        // RISK AMOUNT
        // =================================================

        const riskAmount =
            calculateRiskAmount(
                balance,
                selectedRisk
            );

        // =================================================
        // VALUE PER PRICE MOVE
        // =================================================

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

        // =================================================
        // RAW LOT CALCULATION
        // =================================================

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

        // =================================================
        // LOT LIMITS
        // =================================================

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

        // =================================================
        // ADAPTIVE LOT SIZING
        // =================================================

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

        // =================================================
        // ROUND LOT
        // =================================================

        calculatedLot =
            roundLot(
                calculatedLot,
                minimumLotStep
            );

        // =================================================
        // MINIMUM LOT CHECK
        // =================================================

        if (
            calculatedLot <
            minimumLot
        ) {
            calculatedLot =
                minimumLot;
        }

        // =================================================
        // MAXIMUM LOT CHECK
        // =================================================

        if (
            calculatedLot >
            maximumLot
        ) {
            calculatedLot =
                maximumLot;
        }

        // =================================================
        // FINAL RISK CALCULATION
        // =================================================

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

        // =================================================
        // FINAL SECURITY CHECK
        // =================================================

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

        // =================================================
        // MARKET VALIDATION
        // =================================================

        if (
            symbol &&
            !isSupportedMarket(symbol)
        ) {
            return res.json({
                approved: false,

                reason:
                    "Unsupported market."
            });
        }

        // =================================================
        // FINAL APPROVAL
        // =================================================

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
                selectedMode,

            balance,
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
// MT5 STATUS
// =====================================================

app.get(
    "/api/mt5/status",
    function (req, res) {
        const liveQuotes =
            updateMT5ConnectionState();

        res.json({
            status:
                liveQuotes > 0
                    ? "connected"
                    : "waiting",

            connector:
                process.env.MT5_CONNECTOR_TOKEN
                    ? "configured"
                    : "not_configured",

            liveQuotes,

            quoteAgeLimitMs:
                MARKET_QUOTE_MAX_AGE_MS,

            execution:
                "DEMO ONLY",

            liveTrading:
                false,

            lastQuote:
                MT5_STATE.lastQuote,

            lastHeartbeat:
                MT5_STATE.lastHeartbeat,

            message:
                liveQuotes > 0
                    ? "MT5 market data is being received."
                    : "Waiting for MT5 market data connector."
        });
    }
);

// =====================================================
// MARKET DATA
// =====================================================

app.get(
    "/api/market",
    function (req, res) {
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
            !isSupportedMarket(symbol)
        ) {
            return res.status(400).json({
                status: "error",
                message:
                    "Unsupported market."
            });
        }

        if (
            !isSupportedTimeframe(timeframe)
        ) {
            return res.status(400).json({
                status: "error",
                message:
                    "Unsupported timeframe."
            });
        }

        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );

        if (!quote) {
            return res.json({
                status: "pending",

                symbol,
                timeframe,

                price: null,
                bid: null,
                ask: null,
                spread: null,
                change: null,

                source: "MT5",

                connection:
                    "CONNECTING",

                message:
                    "Waiting for MT5 market data."
            });
        }

        const age =
            getQuoteAge(quote);

        if (
            !isQuoteLive(quote)
        ) {
            return res.json({
                status: "stale",

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
                    "MT5 market quote is stale."
            });
        }

        return res.json({
            status: "live",

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
    function (req, res) {
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
            !isSupportedMarket(symbol)
        ) {
            return res.status(400).json({
                status: "error",
                message:
                    "Unsupported market."
            });
        }

        if (
            !isSupportedTimeframe(timeframe)
        ) {
            return res.status(400).json({
                status: "error",
                message:
                    "Unsupported timeframe."
            });
        }

        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );

        if (!quote) {
            return res.json({
                status: "connecting",

                symbol,
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
            getQuoteAge(quote);

        const live =
            isQuoteLive(quote);

        return res.json({
            status:
                live
                    ? "live"
                    : "stale",

            symbol,
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
// TELEGRAM TEST
// =====================================================

app.get(
    "/api/telegram/test",
    async function (req, res) {
        try {
            const result =
                await sendTelegramMessage(
                    "🤖 PCS AI TEST\n\n" +
                    "Telegram notification system is working.\n\n" +
                    "System: PCS AI\n" +
                    "Status: ONLINE"
                );

            if (!result.sent) {
                return res.status(500).json({
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
        } catch (error) {
            console.error(
                "Telegram test error:",
                error
            );

            return res.status(500).json({
                status: "error",
                message:
                    error.message
            });
        }
    }
);
      // =====================================================
// 404 HANDLER
// =====================================================

app.use(
    function (req, res) {
        res.status(404).json({
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
    function (error, req, res, next) {
        console.error(
            "PCS AI SERVER ERROR:",
            error
        );

        res.status(500).json({
            status: "error",

            message:
                "Internal PCS AI server error."
        });
    }
);

// =====================================================
// START PCS AI BACKEND
// =====================================================

app.listen(
    PORT,
    function () {
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
            `Modes: ${PCS_MODES.join(", ")}`
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
