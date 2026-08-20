const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const SYSTEM_VERSION = "3.3";


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
// EXECUTION TYPES
// =====================================================

const EXECUTION_TYPES = [
    "demo",
    "live"
];


// =====================================================
// SIGNAL TYPES
// =====================================================

const SIGNAL_TYPES = [
    "BUY",
    "SELL",
    "WAIT"
];


// =====================================================
// SIGNAL SOURCES
// =====================================================

const SIGNAL_SOURCES = [
    "TradingView",
    "MT5",
    "PCS",
    "manual"
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
// PHASE 2 — MODE CONFIGURATION
// =====================================================

const MODE_CONFIG = {

    standard: {

        name: "Standard",

        enabled: true,

        execution: "demo",

        riskPerTradePercent: 1,

        maxDrawdownPercent: 10,

        dailyDrawdownPercent: 5,

        maxPositionsPerPair: 3,

        topDownTimeframes: [
            "4h",
            "1h",
            "30m",
            "15m"
        ],

        allowStacking: false,

        allowCompounding: false,

        automaticLotSizing: true,

        requireStopLoss: true,

        dynamicTP3: true

    },

    scalper: {

        name: "Scalper/Aggressive",

        enabled: true,

        execution: "demo",

        riskPerTradePercent: 1,

        maxDrawdownPercent: 10,

        dailyDrawdownPercent: 5,

        maxPositionsPerPair: 10,

        topDownTimeframes: [
            "1h",
            "15m",
            "5m"
        ],

        allowStacking: true,

        allowCompounding: true,

        automaticLotSizing: true,

        requireStopLoss: true,

        dynamicTP3: true

    },

    compounding: {

        name: "Compounding",

        enabled: true,

        execution: "demo",

        riskPerTradePercent: 1,

        maxDrawdownPercent: 10,

        dailyDrawdownPercent: 5,

        maxPositionsPerPair: 5,

        topDownTimeframes: [
            "1d",
            "4h",
            "1h",
            "30m",
            "15m"
        ],

        allowStacking: false,

        allowCompounding: true,

        automaticLotSizing: true,

        requireStopLoss: true,

        dynamicTP3: true

    },

    prop: {

        name: "Prop Mode",

        enabled: true,

        execution: "demo",

        riskPerTradePercent: 0.5,

        maxDrawdownPercent: 10,

        dailyDrawdownPercent: 5,

        maxPositionsPerPair: 3,

        topDownTimeframes: [
            "4h",
            "1h",
            "30m",
            "15m"
        ],

        allowStacking: false,

        allowCompounding: false,

        automaticLotSizing: true,

        requireStopLoss: true,

        dynamicTP3: true

    }

};


// =====================================================
// EXECUTION STATE
// =====================================================

const EXECUTION_STATE = {

    type: "demo",

    liveTradingEnabled: false,

    changedAt:
        new Date().toISOString()

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
// CANDLE DATABASE
// =====================================================

const CANDLE_DATABASE = new Map();

const MAX_CANDLES_PER_SERIES =
    Number(
        process.env.MAX_CANDLES_PER_SERIES || 500
    );


// =====================================================
// SIGNAL DATABASE
// =====================================================

const SIGNAL_HISTORY = [];

const MAX_SIGNAL_HISTORY =
    Number(
        process.env.MAX_SIGNAL_HISTORY || 1000
    );


// =====================================================
// TRADE DATABASE
// =====================================================

const TRADE_HISTORY = [];

const MAX_TRADE_HISTORY =
    Number(
        process.env.MAX_TRADE_HISTORY || 1000
    );


// =====================================================
// ACCOUNT STATE
// =====================================================

const ACCOUNT_STATE = {

    configured: false,

    accountId: null,

    accountType: "demo",

    balance: 0,

    equity: 0,

    startingBalance: 0,

    peakEquity: 0,

    dailyStartEquity: 0,

    dailyStartDate:
        new Date().toISOString().slice(0, 10),

    openPositions: [],

    updatedAt:
        new Date().toISOString()

};


// =====================================================
// PCS ENGINE STATE
// =====================================================

const PCS_ENGINE_STATE = {

    enabled: true,

    lastEvaluation: null,

    lastSignal: null,

    evaluations: 0,

    approvedSignals: 0,

    rejectedSignals: 0,

    waitSignals: 0

};


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
// TRADINGVIEW CONNECTION STATE
// =====================================================

const TRADINGVIEW_STATE = {

    connected: false,

    lastWebhook: null,

    webhookRequests: 0,

    acceptedRequests: 0,

    rejectedRequests: 0,

    connector: "TradingView",

    status: "waiting"

};


// =====================================================
// PHASE 4 EXECUTION ADAPTER STATE
// =====================================================

const EXECUTION_ADAPTER = {

    ready: false,

    broker: null,

    connector: "MT5",

    executionAllowed: false,

    liveExecutionImplemented: false,

    message:
        "Execution adapter is prepared for Phase 4."

};


// =====================================================
// PCS AI SESSION STATE
// =====================================================

const SYSTEM_STATE = {

    startedAt:
        new Date().toISOString(),

    requests: 0,

    marketRequests: 0,

    riskRequests: 0,

    quoteRequests: 0,

    candleRequests: 0,

    signalRequests: 0,

    tradeRequests: 0

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


function normalizeMode(mode) {

    return String(
        mode || "standard"
    )
        .trim()
        .toLowerCase();

}


function normalizeExecutionType(type) {

    return String(
        type || "demo"
    )
        .trim()
        .toLowerCase();

}


function normalizeSignal(signal) {

    return String(
        signal || "WAIT"
    )
        .trim()
        .toUpperCase();

}


function isSupportedMarket(symbol) {

    return getAllMarkets()
        .includes(
            normalizeSymbol(symbol)
        );

}


function isSupportedTimeframe(timeframe) {

    return TIMEFRAMES
        .includes(
            normalizeTimeframe(timeframe)
        );

}


function isValidMode(mode) {

    return PCS_MODES.includes(
        normalizeMode(mode)
    );

}


function isValidExecutionType(type) {

    return EXECUTION_TYPES.includes(
        normalizeExecutionType(type)
    );

}


function isValidSignal(signal) {

    return SIGNAL_TYPES.includes(
        normalizeSignal(signal)
    );

}


function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );

}


function roundNumber(value, decimals = 5) {

    if (
        !isValidNumber(value)
    ) {

        return 0;

    }

    return Number(
        value.toFixed(decimals)
    );

}


function getTodayDate() {

    return new Date()
        .toISOString()
        .slice(0, 10);

}


function generateId(prefix) {

    return (
        prefix +
        "-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


// =====================================================
// REQUEST COUNTER
// =====================================================

app.use(
    function (req, res, next) {

        SYSTEM_STATE.requests++;

        next();

    }
);


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


function getPeakDrawdownPercent() {

    if (
        ACCOUNT_STATE.peakEquity <= 0
    ) {

        return 0;

    }

    return Math.max(
        0,
        (
            (
                ACCOUNT_STATE.peakEquity -
                ACCOUNT_STATE.equity
            ) /
            ACCOUNT_STATE.peakEquity
        ) * 100
    );

}


function getDailyLossPercent() {

    if (
        ACCOUNT_STATE.dailyStartEquity <= 0
    ) {

        return 0;

    }

    return Math.max(
        0,
        (
            (
                ACCOUNT_STATE.dailyStartEquity -
                ACCOUNT_STATE.equity
            ) /
            ACCOUNT_STATE.dailyStartEquity
        ) * 100
    );

}


// =====================================================
// POSITION LIMITS
// =====================================================

function getPositionLimit(mode) {

    const normalizedMode =
        normalizeMode(mode);

    if (
        isValidMode(normalizedMode)
    ) {

        return MODE_CONFIG[
            normalizedMode
        ].maxPositionsPerPair;

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
        !isSupportedMarket(symbol)
    ) {

        return false;

    }

    if (
        !isSupportedTimeframe(timeframe)
    ) {

        return false;

    }

    const now =
        Date.now();

    const receivedAt =
        new Date(
            now
        ).toISOString();

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
                receivedAt,

            receivedAt:
                receivedAt

        }
    );

    MT5_STATE.connected = true;

    MT5_STATE.lastQuote =
        receivedAt;

    MT5_STATE.lastHeartbeat =
        receivedAt;

    SYSTEM_STATE.quoteRequests++;

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
        `${normalizeSymbol(symbol)}:${normalizeTimeframe(timeframe)}`
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

    const receivedTime =
        new Date(
            quote.receivedAt
        ).getTime();

    if (
        !Number.isFinite(
            receivedTime
        )
    ) {

        return false;

    }

    const age =
        Date.now() -
        receivedTime;

    return (
        age >= 0 &&
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

    const receivedTime =
        new Date(
            quote.receivedAt
        ).getTime();

    if (
        !Number.isFinite(
            receivedTime
        )
    ) {

        return null;

    }

    return (
        Date.now() -
        receivedTime
    );

}


// =====================================================
// UPDATE MT5 CONNECTION STATE
// =====================================================

function updateMT5ConnectionState() {

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

    MT5_STATE.connected =
        liveQuotes > 0;

    if (
        liveQuotes === 0
    ) {

        MT5_STATE.execution =
            "DEMO ONLY";

    }

    return liveQuotes;

}


// =====================================================
// TELEGRAM NOTIFICATION ENGINE
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

                    body:
                        JSON.stringify({

                            chat_id:
                                chatId,

                            text:
                                String(
                                    message
                                )

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
// PHASE 3 — CANDLE VALIDATION
// =====================================================

function normalizeCandle(candle) {

    if (
        !candle ||
        !isValidNumber(candle.open) ||
        !isValidNumber(candle.high) ||
        !isValidNumber(candle.low) ||
        !isValidNumber(candle.close)
    ) {

        return null;

    }

    const open =
        Number(candle.open);

    const high =
        Number(candle.high);

    const low =
        Number(candle.low);

    const close =
        Number(candle.close);

    if (
        high < Math.max(open, close) ||
        low > Math.min(open, close) ||
        high < low
    ) {

        return null;

    }

    return {

        time:
            candle.time ||
            candle.timestamp ||
            new Date().toISOString(),

        open,

        high,

        low,

        close,

        volume:
            isValidNumber(candle.volume)
                ? Number(candle.volume)
                : 0

    };

}


// =====================================================
// PHASE 3 — CANDLE STORAGE
// =====================================================

function saveCandles(
    symbol,
    timeframe,
    candles
) {

    const normalizedSymbol =
        normalizeSymbol(symbol);

    const normalizedTimeframe =
        normalizeTimeframe(timeframe);

    if (
        !isSupportedMarket(
            normalizedSymbol
        )
    ) {

        return {

            saved: false,

            reason:
                "Unsupported market."

        };

    }

    if (
        !isSupportedTimeframe(
            normalizedTimeframe
        )
    ) {

        return {

            saved: false,

            reason:
                "Unsupported timeframe."

        };

    }

    if (
        !Array.isArray(candles)
    ) {

        return {

            saved: false,

            reason:
                "Candles must be an array."

        };

    }

    const key =
        `${normalizedSymbol}:${normalizedTimeframe}`;

    const existing =
        CANDLE_DATABASE.get(key) || [];

    const validCandles =
        candles
            .map(normalizeCandle)
            .filter(Boolean);

    const merged = [
        ...existing,
        ...validCandles
    ];

    merged.sort(
        function (a, b) {

            return (
                new Date(a.time).getTime() -
                new Date(b.time).getTime()
            );

        }
    );

    const unique = [];

    const seen = new Set();

    for (
        const candle of merged
    ) {

        const candleKey =
            String(candle.time);

        if (
            !seen.has(candleKey)
        ) {

            seen.add(candleKey);

            unique.push(candle);

        }

    }

    const trimmed =
        unique.slice(
            -MAX_CANDLES_PER_SERIES
        );

    CANDLE_DATABASE.set(
        key,
        trimmed
    );

    if (
        trimmed.length > 0
    ) {

        const last =
            trimmed[
                trimmed.length - 1
            ];

        saveMarketQuote({

            symbol:
                normalizedSymbol,

            timeframe:
                normalizedTimeframe,

            price:
                last.close,

            source:
                "TradingView"

        });

    }

    return {

        saved: true,

        symbol:
            normalizedSymbol,

        timeframe:
            normalizedTimeframe,

        received:
            candles.length,

        accepted:
            validCandles.length,

        total:
            trimmed.length

    };

}


// =====================================================
// PHASE 3 — GET CANDLES
// =====================================================

function getCandles(
    symbol,
    timeframe,
    limit = 100
) {

    const key =
        `${normalizeSymbol(symbol)}:${normalizeTimeframe(timeframe)}`;

    const candles =
        CANDLE_DATABASE.get(key) || [];

    const safeLimit =
        clamp(
            Math.floor(
                Number(limit) || 100
            ),
            1,
            MAX_CANDLES_PER_SERIES
        );

    return candles.slice(
        -safeLimit
    );

}

// =====================================================
// PHASE 3 — EMA
// =====================================================

function calculateEMA(
    values,
    period
) {

    if (
        !Array.isArray(values) ||
        values.length === 0 ||
        period <= 0
    ) {

        return null;

    }

    if (
        values.length < period
    ) {

        return null;

    }

    const multiplier =
        2 / (period + 1);

    let ema = 0;

    for (
        let i = 0;
        i < period;
        i++
    ) {

        ema +=
            Number(values[i]);

    }

    ema /= period;

    for (
        let i = period;
        i < values.length;
        i++
    ) {

        ema =
            (
                (
                    Number(values[i]) -
                    ema
                ) *
                multiplier
            ) +
            ema;

    }

    return ema;

}


// =====================================================
// PHASE 3 — ATR
// =====================================================

function calculateATR(
    candles,
    period = 14
) {

    if (
        !Array.isArray(candles) ||
        candles.length < period + 1
    ) {

        return null;

    }

    const trueRanges = [];

    for (
        let i = 1;
        i < candles.length;
        i++
    ) {

        const current =
            candles[i];

        const previous =
            candles[i - 1];

        const tr =
            Math.max(
                current.high -
                    current.low,

                Math.abs(
                    current.high -
                    previous.close
                ),

                Math.abs(
                    current.low -
                    previous.close
                )
            );

        trueRanges.push(tr);

    }

    if (
        trueRanges.length < period
    ) {

        return null;

    }

    let atr = 0;

    for (
        let i = 0;
        i < period;
        i++
    ) {

        atr +=
            trueRanges[i];

    }

    atr /= period;

    for (
        let i = period;
        i < trueRanges.length;
        i++
    ) {

        atr =
            (
                (
                    atr *
                    (period - 1)
                ) +
                trueRanges[i]
            ) /
            period;

    }

    return atr;

}


// =====================================================
// PHASE 3 — HEIKEN ASHI
// =====================================================

function calculateHeikenAshi(
    candles
) {

    if (
        !Array.isArray(candles) ||
        candles.length === 0
    ) {

        return [];

    }

    const result = [];

    let previousHAOpen = null;
    let previousHAClose = null;

    for (
        const candle of candles
    ) {

        const haClose =
            (
                candle.open +
                candle.high +
                candle.low +
                candle.close
            ) / 4;

        const haOpen =
            previousHAOpen === null
                ? (
                    candle.open +
                    candle.close
                ) / 2
                : (
                    previousHAOpen +
                    previousHAClose
                ) / 2;

        const haHigh =
            Math.max(
                candle.high,
                haOpen,
                haClose
            );

        const haLow =
            Math.min(
                candle.low,
                haOpen,
                haClose
            );

        result.push({

            time:
                candle.time,

            open:
                haOpen,

            high:
                haHigh,

            low:
                haLow,

            close:
                haClose

        });

        previousHAOpen =
            haOpen;

        previousHAClose =
            haClose;

    }

    return result;

}


// =====================================================
// PHASE 3 — HA DOJI DETECTION
// =====================================================

function detectHADoji(
    haCandle,
    threshold = 0.20
) {

    if (
        !haCandle
    ) {

        return false;

    }

    const range =
        haCandle.high -
        haCandle.low;

    if (
        range <= 0
    ) {

        return false;

    }

    const body =
        Math.abs(
            haCandle.close -
            haCandle.open
        );

    return (
        body / range <=
        threshold
    );

}

// =====================================================
// PHASE 3 — HAMMER DETECTION
// =====================================================

function detectHammer(
    candle
) {

    if (
        !candle
    ) {

        return false;

    }

    const body =
        Math.abs(
            candle.close -
            candle.open
        );

    const range =
        candle.high -
        candle.low;

    if (
        range <= 0
    ) {

        return false;

    }

    const upperWick =
        candle.high -
        Math.max(
            candle.open,
            candle.close
        );

    const lowerWick =
        Math.min(
            candle.open,
            candle.close
        ) -
        candle.low;

    const smallBody =
        body <= range * 0.4;

    const longLowerWick =
        lowerWick >= body * 2;

    const smallUpperWick =
        upperWick <= range * 0.3;

    return (
        smallBody &&
        longLowerWick &&
        smallUpperWick
    );

}


// =====================================================
// PHASE 3 — MARKET STRUCTURE
// =====================================================

function detectMarketStructure(
    candles,
    lookback = 3
) {

    if (
        !Array.isArray(candles) ||
        candles.length <
            lookback * 2 + 2
    ) {

        return {

            direction:
                "neutral",

            bullish:
                false,

            bearish:
                false

        };

    }

    const recent =
        candles.slice(
            -lookback
        );

    const previous =
        candles.slice(
            -(lookback * 2),
            -lookback
        );

    const recentHigh =
        Math.max(
            ...recent.map(
                c => c.high
            )
        );

    const previousHigh =
        Math.max(
            ...previous.map(
                c => c.high
            )
        );

    const recentLow =
        Math.min(
            ...recent.map(
                c => c.low
            )
        );

    const previousLow =
        Math.min(
            ...previous.map(
                c => c.low
            )
        );

    const bullish =
        recentHigh > previousHigh &&
        recentLow > previousLow;

    const bearish =
        recentHigh < previousHigh &&
        recentLow < previousLow;

    return {

        direction:
            bullish
                ? "bullish"
                : bearish
                    ? "bearish"
                    : "neutral",

        bullish,

        bearish,

        recentHigh,

        previousHigh,

        recentLow,

        previousLow

    };

}


// =====================================================
// PHASE 3 — LIQUIDITY SWEEP
// =====================================================

function detectLiquiditySweep(
    candles
) {

    if (
        !Array.isArray(candles) ||
        candles.length < 5
    ) {

        return {

            bullish:
                false,

            bearish:
                false,

            type:
                "none"

        };

    }

    const current =
        candles[
            candles.length - 1
        ];

    const previous =
        candles.slice(
            -5,
            -1
        );

    const previousHigh =
        Math.max(
            ...previous.map(
                c => c.high
            )
        );

    const previousLow =
        Math.min(
            ...previous.map(
                c => c.low
            )
        );

    const bullish =
        current.low <
            previousLow &&
        current.close >
            previousLow;

    const bearish =
        current.high >
            previousHigh &&
        current.close <
            previousHigh;

    return {

        bullish,

        bearish,

        type:
            bullish
                ? "bullish_sweep"
                : bearish
                    ? "bearish_sweep"
                    : "none",

        previousHigh,

        previousLow

    };

}

// =====================================================
// PHASE 3 — DISPLACEMENT
// =====================================================

function detectDisplacement(
    candles
) {

    if (
        !Array.isArray(candles) ||
        candles.length < 6
    ) {

        return {

            bullish:
                false,

            bearish:
                false

        };

    }

    const current =
        candles[
            candles.length - 1
        ];

    const previous =
        candles.slice(
            -6,
            -1
        );

    const averageRange =
        previous.reduce(
            function (sum, candle) {

                return (
                    sum +
                    (
                        candle.high -
                        candle.low
                    )
                );

            },
            0
        ) /
        previous.length;

    const currentRange =
        current.high -
        current.low;

    const body =
        Math.abs(
            current.close -
            current.open
        );

    const bullish =
        current.close >
            current.open &&
        currentRange >
            averageRange * 1.2 &&
        body >
            currentRange * 0.6;

    const bearish =
        current.close <
            current.open &&
        currentRange >
            averageRange * 1.2 &&
        body >
            currentRange * 0.6;

    return {

        bullish,

        bearish,

        range:
            currentRange,

        averageRange

    };

}


// =====================================================
// PHASE 3 — TOP DOWN ANALYSIS
// =====================================================

function getTimeframeBias(
    symbol,
    timeframe
) {

    const candles =
        getCandles(
            symbol,
            timeframe,
            100
        );

    if (
        candles.length < 50
    ) {

        return {

            timeframe,

            bias:
                "insufficient_data",

            candles:
                candles.length

        };

    }

    const closes =
        candles.map(
            c => c.close
        );

    const ema20 =
        calculateEMA(
            closes,
            20
        );

    const ema50 =
        calculateEMA(
            closes,
            50
        );

    const lastClose =
        closes[
            closes.length - 1
        ];

    if (
        ema20 === null ||
        ema50 === null
    ) {

        return {

            timeframe,

            bias:
                "insufficient_data",

            candles:
                candles.length

        };

    }

    const structure =
        detectMarketStructure(
            candles
        );

    let bias =
        "neutral";

    if (
        lastClose > ema20 &&
        ema20 > ema50
    ) {

        bias =
            "bullish";

    }

    else if (
        lastClose < ema20 &&
        ema20 < ema50
    ) {

        bias =
            "bearish";

    }

    return {

        timeframe,

        bias,

        close:
            roundNumber(
                lastClose
            ),

        ema20:
            roundNumber(
                ema20
            ),

        ema50:
            roundNumber(
                ema50
            ),

        structure:
            structure.direction,

        candles:
            candles.length

    };

}


// =====================================================
// PHASE 3 — PCS SIGNAL ENGINE
// =====================================================

function evaluatePCS(
    options = {}
) {

    const symbol =
        normalizeSymbol(
            options.symbol
        );

    const mode =
        normalizeMode(
            options.mode
        );

    const timeframe =
        normalizeTimeframe(
            options.timeframe || "5m"
        );

    if (
        !isSupportedMarket(symbol)
    ) {

        return {

            success: false,

            reason:
                "Unsupported market."

        };

    }

    if (
        !isValidMode(mode)
    ) {

        return {

            success: false,

            reason:
                "Unsupported PCS mode."

        };

    }

    const modeConfig =
        MODE_CONFIG[mode];

    const analysisTimeframes =
        modeConfig.topDownTimeframes;

    const timeframeAnalysis =
        analysisTimeframes.map(
            function (tf) {

                return getTimeframeBias(
                    symbol,
                    tf
                );

            }
        );

    const executionCandles =
        getCandles(
            symbol,
            timeframe,
            100
        );

    if (
        executionCandles.length < 50
    ) {

        PCS_ENGINE_STATE.waitSignals++;

        return {

            success: true,

            signal:
                "WAIT",

            approved:
                false,

            reason:
                "Insufficient candle data for PCS analysis.",

            symbol,

            mode,

            timeframe,

            timeframeAnalysis,

            score: {

                long: 0,

                short: 0,

                required: 4

            }

        };

    }

    const closes =
        executionCandles.map(
            c => c.close
        );

    const ema20 =
        calculateEMA(
            closes,
            20
        );

    const ema50 =
        calculateEMA(
            closes,
            50
        );

    const atr =
        calculateATR(
            executionCandles,
            14
        );

    const ha =
        calculateHeikenAshi(
            executionCandles
        );

    const lastHA =
        ha[
            ha.length - 1
        ];

    const current =
        executionCandles[
            executionCandles.length - 1
        ];

    const structure =
        detectMarketStructure(
            executionCandles
        );

    const liquidity =
        detectLiquiditySweep(
            executionCandles
        );

    const displacement =
        detectDisplacement(
            executionCandles
        );

    const haDoji =
        detectHADoji(
            lastHA,
            0.20
        );

    const hammer =
        detectHammer(
            current
        );

    const bullTrend =
        ema20 !== null &&
        ema50 !== null &&
        current.close >
            ema20 &&
        ema20 >
            ema50;

    const bearTrend =
        ema20 !== null &&
        ema50 !== null &&
        current.close <
            ema20 &&
        ema20 <
            ema50;

    const bullishStructure =
        structure.bullish;

    const bearishStructure =
        structure.bearish;

    const bullishConfirmation =
        bullTrend &&
        (
            bullishStructure ||
            liquidity.bullish ||
            displacement.bullish
        );

    const bearishConfirmation =
        bearTrend &&
        (
            bearishStructure ||
            liquidity.bearish ||
            displacement.bearish
        );

    let longScore = 0;
    let shortScore = 0;

    if (
        bullTrend
    ) {

        longScore++;

    }

    if (
        bearTrend
    ) {

        shortScore++;

    }

    if (
        liquidity.bullish
    ) {

        longScore++;

    }

    if (
        liquidity.bearish
    ) {

        shortScore++;

    }

    if (
        bullishStructure
    ) {

        longScore++;

    }

    if (
        bearishStructure
    ) {

        shortScore++;

    }

    if (
        displacement.bullish
    ) {

        longScore++;

    }

    if (
        displacement.bearish
    ) {

        shortScore++;

    }

    if (
        haDoji ||
        hammer
    ) {

        if (
            current.close >
            current.open
        ) {

            longScore++;

        }

        else if (
            current.close <
            current.open
        ) {

            shortScore++;

        }

    }

    const higherBullishCount =
        timeframeAnalysis.filter(
            item =>
                item.bias === "bullish"
        ).length;

    const higherBearishCount =
        timeframeAnalysis.filter(
            item =>
                item.bias === "bearish"
        ).length;

    if (
        higherBullishCount >=
        Math.ceil(
            analysisTimeframes.length / 2
        )
    ) {

        longScore++;

    }

    if (
        higherBearishCount >=
        Math.ceil(
            analysisTimeframes.length / 2
        )
    ) {

        shortScore++;

    }

    const minimumScore = 4;

    let signal =
        "WAIT";

    if (
        longScore >= minimumScore &&
        longScore > shortScore
    ) {

        signal =
            "BUY";

    }

    else if (
        shortScore >= minimumScore &&
        shortScore > longScore
    ) {

        signal =
            "SELL";

    }

    let stopLoss =
        null;

    let tp1 =
        null;

    let tp2 =
        null;

    let tp3 =
        null;

    if (
        atr !== null &&
        signal === "BUY"
    ) {

        stopLoss =
            current.low -
            (
                atr * 0.25
            );

        const riskDistance =
            current.close -
            stopLoss;

        tp1 =
            current.close +
            riskDistance;

        tp2 =
            current.close +
            riskDistance * 2;

        tp3 =
            current.close +
            riskDistance * 3;

    }

    if (
        atr !== null &&
        signal === "SELL"
    ) {

        stopLoss =
            current.high +
            (
                atr * 0.25
            );

        const riskDistance =
            stopLoss -
            current.close;

        tp1 =
            current.close -
            riskDistance;

        tp2 =
            current.close -
            riskDistance * 2;

        tp3 =
            current.close -
            riskDistance * 3;

    }

    const result = {

        success: true,

        signal,

        approved:
            signal !== "WAIT",

        symbol,

        mode,

        timeframe,

        source:
            "PCS",

        price:
            current.close,

        entry:
            current.close,

        stopLoss:
            stopLoss === null
                ? null
                : roundNumber(
                    stopLoss
                ),

        takeProfit: {

            tp1:
                tp1 === null
                    ? null
                    : roundNumber(tp1),

            tp2:
                tp2 === null
                    ? null
                    : roundNumber(tp2),

            tp3:
                tp3 === null
                    ? null
                    : roundNumber(tp3)

        },

        atr:
            atr === null
                ? null
                : roundNumber(atr),

        score: {

            long:
                longScore,

            short:
                shortScore,

            required:
                minimumScore

        },

        confirmations: {

            trend:
                bullTrend
                    ? "bullish"
                    : bearTrend
                        ? "bearish"
                        : "neutral",

            structure:
                structure.direction,

            liquiditySweep:
                liquidity.type,

            displacement:
                displacement.bullish
                    ? "bullish"
                    : displacement.bearish
                        ? "bearish"
                        : "none",

            heikenAshiDoji:
                haDoji,

            hammer:
                hammer

        },

        timeframeAnalysis,

        execution:
            EXECUTION_STATE.type,

        liveTradingEnabled:
            false,

        timestamp:
            new Date().toISOString()

    };

    PCS_ENGINE_STATE.evaluations++;

    PCS_ENGINE_STATE.lastEvaluation =
        result.timestamp;

    PCS_ENGINE_STATE.lastSignal =
        result.signal;

    if (
        result.signal === "WAIT"
    ) {

        PCS_ENGINE_STATE.waitSignals++;

    }

    else {

        PCS_ENGINE_STATE.approvedSignals++;

    }

    return result;

}

// =====================================================
// PHASE 3 — SIGNAL HISTORY
// =====================================================

function storeSignal(signal) {

    const record = {

        id:
            generateId("SIG"),

        ...signal,

        createdAt:
            new Date().toISOString()

    };

    SIGNAL_HISTORY.push(
        record
    );

    while (
        SIGNAL_HISTORY.length >
        MAX_SIGNAL_HISTORY
    ) {

        SIGNAL_HISTORY.shift();

    }

    return record;

}


// =====================================================
// PHASE 3 — ACCOUNT UPDATE
// =====================================================

function updateAccountState(data) {

    if (
        !data ||
        !isValidNumber(data.balance) ||
        data.balance < 0
    ) {

        return {

            success: false,

            reason:
                "Invalid balance."

        };

    }

    const balance =
        Number(
            data.balance
        );

    const equity =
        isValidNumber(data.equity)
            ? Number(data.equity)
            : balance;

    const today =
        getTodayDate();

    if (
        ACCOUNT_STATE.dailyStartDate !==
        today
    ) {

        ACCOUNT_STATE.dailyStartDate =
            today;

        ACCOUNT_STATE.dailyStartEquity =
            equity;

    }

    if (
        !ACCOUNT_STATE.configured
    ) {

        ACCOUNT_STATE.startingBalance =
            balance;

        ACCOUNT_STATE.dailyStartEquity =
            equity;

    }

    ACCOUNT_STATE.configured =
        true;

    ACCOUNT_STATE.balance =
        balance;

    ACCOUNT_STATE.equity =
        equity;

    ACCOUNT_STATE.peakEquity =
        Math.max(
            ACCOUNT_STATE.peakEquity,
            equity
        );

    ACCOUNT_STATE.accountId =
        data.accountId ||
        ACCOUNT_STATE.accountId ||
        null;

    ACCOUNT_STATE.accountType =
        normalizeExecutionType(
            data.accountType ||
            ACCOUNT_STATE.accountType
        );

    ACCOUNT_STATE.openPositions =
        Array.isArray(
            data.openPositions
        )
            ? data.openPositions
            : ACCOUNT_STATE.openPositions;

    ACCOUNT_STATE.updatedAt =
        new Date().toISOString();

    return {

        success: true,

        account:
            {
                ...ACCOUNT_STATE
            }

    };

}


// =====================================================
// PHASE 3 — TRADE JOURNAL
// =====================================================

function storeTrade(trade) {

    const record = {

        id:
            trade.id ||
            generateId("TRD"),

        symbol:
            normalizeSymbol(
                trade.symbol
            ),

        mode:
            normalizeMode(
                trade.mode
            ),

        execution:
            normalizeExecutionType(
                trade.execution ||
                EXECUTION_STATE.type
            ),

        side:
            normalizeSignal(
                trade.side ||
                trade.signal ||
                "WAIT"
            ),

        entry:
            isValidNumber(trade.entry)
                ? Number(trade.entry)
                : null,

        stopLoss:
            isValidNumber(trade.stopLoss)
                ? Number(trade.stopLoss)
                : null,

        takeProfit:
            isValidNumber(trade.takeProfit)
                ? Number(trade.takeProfit)
                : null,

        lotSize:
            isValidNumber(trade.lotSize)
                ? Number(trade.lotSize)
                : null,

        status:
            trade.status ||
            "OPEN",

        profit:
            isValidNumber(trade.profit)
                ? Number(trade.profit)
                : 0,

        source:
            trade.source ||
            "PCS",

        createdAt:
            trade.createdAt ||
            new Date().toISOString(),

        closedAt:
            trade.closedAt ||
            null,

        metadata:
            trade.metadata ||
            {}

    };

    TRADE_HISTORY.push(
        record
    );

    while (
        TRADE_HISTORY.length >
        MAX_TRADE_HISTORY
    ) {

        TRADE_HISTORY.shift();

    }

    return record;

    }

// =====================================================
// PHASE 3 — SIGNAL APPROVAL PIPELINE
// =====================================================

async function approveSignalForExecution(
    signal,
    options = {}
) {

    if (
        !signal ||
        signal.signal === "WAIT"
    ) {

        return {

            approved:
                false,

            reason:
                "PCS signal is WAIT."

        };

    }

    const mode =
        normalizeMode(
            signal.mode ||
            options.mode
        );

    const modeConfig =
        MODE_CONFIG[mode];

    if (
        !modeConfig ||
        !modeConfig.enabled
    ) {

        return {

            approved:
                false,

            reason:
                "Selected PCS mode is disabled."

        };

    }

    if (
        EXECUTION_STATE.type !== "demo"
    ) {

        return {

            approved:
                false,

            reason:
                "Live execution is not implemented in Phase 3."

        };

    }

    const account =
        ACCOUNT_STATE;

    if (
        !account.configured ||
        account.balance <= 0
    ) {

        return {

            approved:
                false,

            reason:
                "Account state is not configured."

        };

    }

    const currentDrawdown =
        getPeakDrawdownPercent();

    const dailyLoss =
        getDailyLossPercent();

    const maxDD =
        modeConfig.maxDrawdownPercent;

    const dailyDD =
        modeConfig.dailyDrawdownPercent;

    if (
        currentDrawdown >= maxDD
    ) {

        PCS_ENGINE_STATE.rejectedSignals++;

        return {

            approved:
                false,

            reason:
                "Maximum account drawdown reached.",

            drawdown:
                currentDrawdown,

            limit:
                maxDD

        };

    }

    if (
        dailyLoss >= dailyDD
    ) {

        PCS_ENGINE_STATE.rejectedSignals++;

        return {

            approved:
                false,

            reason:
                "Maximum daily drawdown reached.",

            dailyLoss,

            limit:
                dailyDD

        };

    }

    const positions =
        account.openPositions
            .filter(
                function (position) {

                    return (
                        normalizeSymbol(
                            position.symbol
                        ) ===
                        normalizeSymbol(
                            signal.symbol
                        )
                    );

                }
            )
            .length;

    if (
        positions >=
        modeConfig.maxPositionsPerPair
    ) {

        PCS_ENGINE_STATE.rejectedSignals++;

        return {

            approved:
                false,

            reason:
                "Maximum positions for this pair reached.",

            positions,

            limit:
                modeConfig.maxPositionsPerPair

        };

    }

    if (
        modeConfig.requireStopLoss &&
        !isValidNumber(
            signal.stopLoss
        )
    ) {

        PCS_ENGINE_STATE.rejectedSignals++;

        return {

            approved:
                false,

            reason:
                "Stop Loss is required."

        };

    }

    return {

        approved:
            true,

        reason:
            "Signal passed PCS Phase 3 approval.",

        execution:
            "demo",

        liveTradingEnabled:
            false,

        drawdown:
            currentDrawdown,

        dailyLoss,

        positions,

        positionLimit:
            modeConfig.maxPositionsPerPair

    };

}


// =====================================================
// ROOT ENDPOINT
// =====================================================

app.get(
    "/",
    function (req, res) {

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            message:
                "PCS AI backend is running.",

            phases: {

                phase1:
                    "complete",

                phase2:
                    "complete",

                phase3:
                    "operational",

                phase4:
                    "ready_to_begin"

            },

            modes:
                PCS_MODES,

            execution:
                EXECUTION_STATE.type,

            liveTrading:
                false

        });

    }
);

// =====================================================
// HEALTH ENDPOINT
// =====================================================

app.get(
    "/api/health",
    function (req, res) {

        const liveQuotes =
            updateMT5ConnectionState();

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            marketData:
                liveQuotes > 0
                    ? "live"
                    : "pending",

            liveQuotes,

            tradingView:
                TRADINGVIEW_STATE.connected
                    ? "connected"
                    : "pending",

            mt5:
                liveQuotes > 0
                    ? "connected"
                    : "pending",

            memory:
                "ready",

            tradeHistory:
                "ready",

            signalEngine:
                PCS_ENGINE_STATE.enabled
                    ? "ready"
                    : "disabled",

            riskEngine:
                "ready",

            modes:
                PCS_MODES,

            execution:
                EXECUTION_STATE.type,

            telegram:
                process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_CHAT_ID
                    ? "configured"
                    : "not_configured",

            tradingExecution:
                "disabled"

        });

    }
);


// =====================================================
// SYSTEM INFORMATION
// =====================================================

app.get(
    "/api/system",
    function (req, res) {

        const liveQuotes =
            updateMT5ConnectionState();

        res.json({

            status:
                "online",

            system:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            engine:
                "PCS AI Phase 3 Engine",

            phases: {

                phase1:
                    "complete",

                phase2:
                    "complete",

                phase3:
                    "complete",

                phase4:
                    "execution integration pending"

            },

            markets:
                getAllMarkets().length,

            timeframes:
                TIMEFRAMES.length,

            modes:
                PCS_MODES,

            riskEngine:
                "ready",

            signalEngine:
                "ready",

            marketData:
                liveQuotes > 0
                    ? "live"
                    : "pending",

            mt5:
                liveQuotes > 0
                    ? "connected"
                    : "pending",

            tradingView:
                TRADINGVIEW_STATE.connected
                    ? "connected"
                    : "pending",

            liveQuotes,

            execution:
                EXECUTION_STATE.type,

            telegram:
                process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_CHAT_ID
                    ? "configured"
                    : "not_configured",

            liveTrading:
                "disabled",

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

            candleRequests:
                SYSTEM_STATE.candleRequests,

            signalRequests:
                SYSTEM_STATE.signalRequests,

            tradeRequests:
                SYSTEM_STATE.tradeRequests

        });

    }
);


// =====================================================
// MARKETS ENDPOINT
// =====================================================

app.get(
    "/api/markets",
    function (req, res) {

        SYSTEM_STATE.marketRequests++;

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
    function (req, res) {

        SYSTEM_STATE.marketRequests++;

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
                        function (symbol) {

                            return symbol
                                .includes(
                                    query
                                );

                        }
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
// RISK CONFIGURATION — GET
// =====================================================

app.get(
    "/api/risk/config",
    function (req, res) {

        res.json({

            status:
                "success",

            risk:
                {
                    ...riskConfig
                }

        });

    }
);


// =====================================================
// RISK CONFIGURATION — UPDATE
// =====================================================

app.post(
    "/api/risk/config",
    function (req, res) {

        const body =
            req.body || {};

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


        newConfig.liveTradingEnabled =
            false;

        riskConfig =
            newConfig;


        return res.json({

            status:
                "success",

            message:
                "Risk configuration updated.",

            risk:
                {
                    ...riskConfig
                }

        });

    }
);


// =====================================================
// PHASE 2 — GET ALL MODES
// =====================================================

app.get(
    "/api/modes",
    function (req, res) {

        res.json({

            status:
                "success",

            modes:
                PCS_MODES,

            executionTypes:
                EXECUTION_TYPES,

            activeExecution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                EXECUTION_STATE.liveTradingEnabled,

            configurations:
                MODE_CONFIG

        });

    }
);


// =====================================================
// PHASE 2 — GET SINGLE MODE
// =====================================================

app.get(
    "/api/modes/:mode",
    function (req, res) {

        const mode =
            normalizeMode(
                req.params.mode
            );

        if (
            !isValidMode(mode)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported PCS AI mode.",

                    availableModes:
                        PCS_MODES

                });

        }

        return res.json({

            status:
                "success",

            mode,

            configuration:
                MODE_CONFIG[mode]

        });

    }
);


// =====================================================
// PHASE 2 — UPDATE MODE
// =====================================================

app.post(
    "/api/modes/:mode",
    function (req, res) {

        const mode =
            normalizeMode(
                req.params.mode
            );

        if (
            !isValidMode(mode)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported PCS AI mode.",

                    availableModes:
                        PCS_MODES

                });

        }

        const body =
            req.body || {};

        const current =
            MODE_CONFIG[mode];

        const updated = {
            ...current
        };


        if (
            typeof body.enabled ===
            "boolean"
        ) {

            updated.enabled =
                body.enabled;

        }


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
                            "Risk per trade must be greater than 0 and at most 100."

                    });

            }

            updated.riskPerTradePercent =
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

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Maximum drawdown must be greater than 0 and at most 100."

                    });

            }

            updated.maxDrawdownPercent =
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

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Daily drawdown must be greater than 0 and at most 100."

                    });

            }

            updated.dailyDrawdownPercent =
                body.dailyDrawdownPercent;

        }


        if (
            isValidNumber(
                body.maxPositionsPerPair
            )
        ) {

            updated.maxPositionsPerPair =
                Math.max(
                    1,
                    Math.floor(
                        body.maxPositionsPerPair
                    )
                );

        }


        if (
            Array.isArray(
                body.topDownTimeframes
            )
        ) {

            const validTimeframes =
                body.topDownTimeframes.filter(
                    function (timeframe) {

                        return isSupportedTimeframe(
                            timeframe
                        );

                    }
                );


            if (
                validTimeframes.length === 0
            ) {

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        message:
                            "Top-down analysis must contain at least one supported timeframe."

                    });

            }


            updated.topDownTimeframes =
                validTimeframes;

        }


        if (
            typeof body.allowStacking ===
            "boolean"
        ) {

            updated.allowStacking =
                body.allowStacking;

        }


        if (
            typeof body.allowCompounding ===
            "boolean"
        ) {

            updated.allowCompounding =
                body.allowCompounding;

        }


        if (
            typeof body.automaticLotSizing ===
            "boolean"
        ) {

            updated.automaticLotSizing =
                body.automaticLotSizing;

        }


        if (
            typeof body.requireStopLoss ===
            "boolean"
        ) {

            updated.requireStopLoss =
                body.requireStopLoss;

        }


        if (
            typeof body.dynamicTP3 ===
            "boolean"
        ) {

            updated.dynamicTP3 =
                body.dynamicTP3;

        }


        MODE_CONFIG[mode] =
            updated;


        return res.json({

            status:
                "success",

            message:
                "PCS AI mode configuration updated.",

            mode,

            configuration:
                MODE_CONFIG[mode]

        });

    }
);

// =====================================================
// PHASE 2 — EXECUTION STATUS
// =====================================================

app.get(
    "/api/execution",
    function (req, res) {

        res.json({

            status:
                "success",

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                EXECUTION_STATE.liveTradingEnabled,

            changedAt:
                EXECUTION_STATE.changedAt

        });

    }
);


// =====================================================
// PHASE 2 — DEMO/LIVE SWITCH
// =====================================================

app.post(
    "/api/execution",
    function (req, res) {

        const body =
            req.body || {};

        const requestedType =
            normalizeExecutionType(
                body.type
            );


        if (
            !isValidExecutionType(
                requestedType
            )
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Execution type must be demo or live.",

                    available:
                        EXECUTION_TYPES

                });

        }


        if (
            requestedType === "demo"
        ) {

            EXECUTION_STATE.type =
                "demo";

            EXECUTION_STATE.liveTradingEnabled =
                false;

            EXECUTION_STATE.changedAt =
                new Date().toISOString();


            return res.json({

                status:
                    "success",

                message:
                    "PCS AI switched to DEMO execution.",

                execution:
                    "demo",

                liveTradingEnabled:
                    false

            });

        }


        return res.json({

            status:
                "blocked",

            message:
                "Live execution is not enabled yet. PCS AI remains in DEMO mode until the live execution engine is completed.",

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                false

        });

    }
);


// =====================================================
// PHASE 2 — ACTIVE MODE SUMMARY
// =====================================================

app.get(
    "/api/modes/active/summary",
    function (req, res) {

        const activeModes =
            PCS_MODES.filter(
                function (mode) {

                    return MODE_CONFIG[mode]
                        .enabled === true;

                }
            );


        res.json({

            status:
                "success",

            activeModes,

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                EXECUTION_STATE.liveTradingEnabled,

            message:
                "PCS AI mode configuration engine is operational."

        });

    }
);


// =====================================================
// MARKET DATA
// =====================================================

app.get(
    "/api/market",
    function (req, res) {

        SYSTEM_STATE.marketRequests++;

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

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported market."

                });

        }


        if (
            !isSupportedTimeframe(timeframe)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported timeframe."

                });

        }


        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );


        if (
            !quote
        ) {

            return res.json({

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

                spread:
                    null,

                change:
                    null,

                source:
                    "MT5",

                connection:
                    "CONNECTING",

                message:
                    "Waiting for MT5 market data."

            });

        }


        const age =
            getQuoteAge(
                quote
            );


        if (
            !isQuoteLive(quote)
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
                    "MT5 market quote is stale."

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

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported market."

                });

        }


        if (
            !isSupportedTimeframe(timeframe)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported timeframe."

                });

        }


        const quote =
            getMarketQuote(
                symbol,
                timeframe
            );


        if (
            !quote
        ) {

            return res.json({

                status:
                    "connecting",

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
// RISK CHECK ENGINE
// =====================================================

app.post(
    "/api/risk/check",
    async function (req, res) {

        SYSTEM_STATE.riskRequests++;

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


        const normalizedMode =
            normalizeMode(
                mode
            );


        if (
            !isValidMode(
                normalizedMode
            )
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Invalid PCS AI mode.",

                availableModes:
                    PCS_MODES

            });

        }


        const modeConfig =
            MODE_CONFIG[
                normalizedMode
            ];


        if (
            !modeConfig.enabled
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Selected PCS AI mode is disabled."

            });

        }


        const selectedRisk =
            isValidNumber(riskPercent)
                ? riskPercent
                : modeConfig.riskPerTradePercent;


        const maxDD =
            isValidNumber(maxDrawdownPercent)
                ? maxDrawdownPercent
                : modeConfig.maxDrawdownPercent;


        const maxDailyDD =
            isValidNumber(dailyDrawdownPercent)
                ? dailyDrawdownPercent
                : modeConfig.dailyDrawdownPercent;


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

                `Mode: ${normalizedMode}\n` +

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

                `Mode: ${normalizedMode}\n` +

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


        const positions =
            Number(
                openPositions || 0
            );


        const positionLimit =
            modeConfig.maxPositionsPerPair;


        if (
            positions >= positionLimit
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Maximum positions for this pair reached.",

                positionLimit

            });

        }


        const stopLossRequired =
            modeConfig.requireStopLoss &&
            riskConfig.requireStopLoss;


        if (
            stopLossRequired &&
            (
                !isValidNumber(entry) ||
                !isValidNumber(stopLoss)
            )
        ) {

            await sendTelegramMessage(

                "⚠️ PCS AI TRADE BLOCKED\n\n" +

                "Stop Loss is required.\n\n" +

                `Mode: ${normalizedMode}\n` +

                `Symbol: ${symbol || "N/A"}`

            );


            return res.json({

                approved:
                    false,

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


        const riskAmount =
            calculateRiskAmount(
                balance,
                selectedRisk
            );


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


        let calculatedLot =
            rawLot;


        if (
            modeConfig.automaticLotSizing &&
            riskConfig.adaptiveLotSizing
        ) {

            calculatedLot =
                Math.min(
                    rawLot,
                    maximumLot
                );

        }


        calculatedLot =
            roundLot(
                calculatedLot,
                minimumLotStep
            );


        if (
            calculatedLot <
            minimumLot
        ) {

            calculatedLot =
                minimumLot;

        }


        if (
            calculatedLot >
            maximumLot
        ) {

            calculatedLot =
                maximumLot;

        }


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


        if (
            symbol &&
            !isSupportedMarket(symbol)
        ) {

            return res.json({

                approved:
                    false,

                reason:
                    "Unsupported market."

            });

        }


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
                normalizedMode,

            execution:
                EXECUTION_STATE.type,

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

            stopLossRequired,

            automaticLotSizing:
                modeConfig.automaticLotSizing,

            dynamicTP3:
                modeConfig.dynamicTP3,

            liveTradingEnabled:
                false,

            message:
                "Trade passed PCS AI risk checks. Live execution remains disabled."

        });

    }
);

// =====================================================
// PHASE 3 — ACCOUNT STATE
// =====================================================

app.get(
    "/api/account",
    function (req, res) {

        res.json({

            status:
                "success",

            configured:
                ACCOUNT_STATE.configured,

            account:
                {
                    ...ACCOUNT_STATE
                },

            metrics: {

                currentDrawdownPercent:
                    roundNumber(
                        getPeakDrawdownPercent(),
                        2
                    ),

                dailyLossPercent:
                    roundNumber(
                        getDailyLossPercent(),
                        2
                    )

            },

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                false

        });

    }
);


// =====================================================
// PHASE 3 — UPDATE ACCOUNT STATE
// =====================================================

app.post(
    "/api/account",
    function (req, res) {

        const result =
            updateAccountState(
                req.body || {}
            );

        if (
            !result.success
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        result.reason

                });

        }

        return res.json({

            status:
                "success",

            message:
                "PCS AI account state updated.",

            account:
                result.account,

            metrics: {

                currentDrawdownPercent:
                    roundNumber(
                        getPeakDrawdownPercent(),
                        2
                    ),

                dailyLossPercent:
                    roundNumber(
                        getDailyLossPercent(),
                        2
                    )

            }

        });

    }
);


// =====================================================
// PHASE 3 — CANDLE INGESTION
// =====================================================

app.post(
    "/api/market/candles",
    function (req, res) {

        SYSTEM_STATE.candleRequests++;

        const body =
            req.body || {};

        const result =
            saveCandles(
                body.symbol,
                body.timeframe,
                body.candles
            );

        if (
            !result.saved
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        result.reason

                });

        }

        TRADINGVIEW_STATE.connected =
            body.source === "TradingView" ||
            body.source === "tradingview" ||
            TRADINGVIEW_STATE.connected;

        TRADINGVIEW_STATE.lastWebhook =
            new Date().toISOString();

        TRADINGVIEW_STATE.acceptedRequests++;

        return res.json({

            status:
                "success",

            source:
                body.source ||
                "unknown",

            ...result

        });

    }
);


// =====================================================
// PHASE 3 — GET CANDLES
// =====================================================

app.get(
    "/api/market/candles",
    function (req, res) {

        SYSTEM_STATE.candleRequests++;

        const symbol =
            normalizeSymbol(
                req.query.symbol
            );

        const timeframe =
            normalizeTimeframe(
                req.query.timeframe ||
                "5m"
            );

        if (
            !isSupportedMarket(symbol)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported market."

                });

        }

        if (
            !isSupportedTimeframe(timeframe)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported timeframe."

                });

        }

        const candles =
            getCandles(
                symbol,
                timeframe,
                req.query.limit
            );

        return res.json({

            status:
                "success",

            symbol,

            timeframe,

            count:
                candles.length,

            candles

        });

    }
);


// =====================================================
// PHASE 3 — CANDLE STATUS
// =====================================================

app.get(
    "/api/market/candles/status",
    function (req, res) {

        const symbol =
            normalizeSymbol(
                req.query.symbol
            );

        const timeframe =
            normalizeTimeframe(
                req.query.timeframe ||
                "5m"
            );

        const candles =
            getCandles(
                symbol,
                timeframe,
                MAX_CANDLES_PER_SERIES
            );

        return res.json({

            status:
                "success",

            symbol,

            timeframe,

            candles:
                candles.length,

            firstCandle:
                candles.length > 0
                    ? candles[0].time
                    : null,

            lastCandle:
                candles.length > 0
                    ? candles[
                        candles.length - 1
                    ].time
                    : null

        });

    }
);


// =====================================================
// PHASE 3 — TRADINGVIEW WEBHOOK
// =====================================================

app.post(
    "/api/tradingview/webhook",
    async function (req, res) {

        TRADINGVIEW_STATE.webhookRequests++;

        const expectedSecret =
            process.env.TRADINGVIEW_WEBHOOK_SECRET;

        const suppliedSecret =
            String(
                req.headers[
                    "x-pcs-webhook-secret"
                ] ||
                req.body?.secret ||
                ""
            );

        if (
            expectedSecret &&
            suppliedSecret !==
                expectedSecret
        ) {

            TRADINGVIEW_STATE.rejectedRequests++;

            return res
                .status(401)
                .json({

                    status:
                        "error",

                    message:
                        "Invalid TradingView webhook secret."

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
            !isSupportedMarket(symbol)
        ) {

            TRADINGVIEW_STATE.rejectedRequests++;

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported TradingView market."

                });

        }

        if (
            !isSupportedTimeframe(timeframe)
        ) {

            TRADINGVIEW_STATE.rejectedRequests++;

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported TradingView timeframe."

                });

        }

        if (
            Array.isArray(body.candles) &&
            body.candles.length > 0
        ) {

            saveCandles(
                symbol,
                timeframe,
                body.candles
            );

        }

        if (
            isValidNumber(body.price)
        ) {

            saveMarketQuote({

                symbol,

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
                    "TradingView"

            });

        }

        TRADINGVIEW_STATE.connected =
            true;

        TRADINGVIEW_STATE.status =
            "connected";

        TRADINGVIEW_STATE.lastWebhook =
            new Date().toISOString();

        TRADINGVIEW_STATE.acceptedRequests++;

        return res.json({

            status:
                "success",

            message:
                "TradingView data accepted.",

            symbol,

            timeframe,

            execution:
                "demo",

            liveTrading:
                false

        });

    }
);

// =====================================================
// PHASE 3 — TRADINGVIEW STATUS
// =====================================================

app.get(
    "/api/tradingview/status",
    function (req, res) {

        res.json({

            status:
                "success",

            connector:
                "TradingView",

            connected:
                TRADINGVIEW_STATE.connected,

            state:
                TRADINGVIEW_STATE.status,

            webhookRequests:
                TRADINGVIEW_STATE.webhookRequests,

            acceptedRequests:
                TRADINGVIEW_STATE.acceptedRequests,

            rejectedRequests:
                TRADINGVIEW_STATE.rejectedRequests,

            lastWebhook:
                TRADINGVIEW_STATE.lastWebhook,

            webhookConfigured:
                Boolean(
                    process.env.TRADINGVIEW_WEBHOOK_SECRET
                )

        });

    }
);


// =====================================================
// PHASE 3 — PCS SIGNAL EVALUATION
// =====================================================

app.get(
    "/api/pcs/evaluate",
    function (req, res) {

        SYSTEM_STATE.signalRequests++;

        const result =
            evaluatePCS({

                symbol:
                    req.query.symbol ||
                    "XAUUSD",

                timeframe:
                    req.query.timeframe ||
                    "5m",

                mode:
                    req.query.mode ||
                    "standard"

            });

        if (
            result.success === false
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    ...result

                });

        }

        const stored =
            storeSignal(
                result
            );

        return res.json({

            status:
                "success",

            signal:
                result,

            signalId:
                stored.id

        });

    }
);


// =====================================================
// PHASE 3 — PCS SIGNAL HISTORY
// =====================================================

app.get(
    "/api/pcs/signals",
    function (req, res) {

        SYSTEM_STATE.signalRequests++;

        const limit =
            clamp(
                Math.floor(
                    Number(
                        req.query.limit
                    ) || 50
                ),
                1,
                MAX_SIGNAL_HISTORY
            );

        const symbol =
            req.query.symbol
                ? normalizeSymbol(
                    req.query.symbol
                )
                : null;

        const mode =
            req.query.mode
                ? normalizeMode(
                    req.query.mode
                )
                : null;

        let results =
            SIGNAL_HISTORY;

        if (
            symbol
        ) {

            results =
                results.filter(
                    signal =>
                        signal.symbol ===
                        symbol
                );

        }

        if (
            mode &&
            isValidMode(mode)
        ) {

            results =
                results.filter(
                    signal =>
                        signal.mode ===
                        mode
                );

        }

        results =
            results.slice(
                -limit
            )
                .reverse();

        return res.json({

            status:
                "success",

            count:
                results.length,

            signals:
                results

        });

    }
);


// =====================================================
// PHASE 3 — SIGNAL APPROVAL
// =====================================================

app.post(
    "/api/pcs/approve",
    async function (req, res) {

        SYSTEM_STATE.signalRequests++;

        const body =
            req.body || {};

        let signal =
            body.signal;

        if (
            !signal
        ) {

            const evaluation =
                evaluatePCS({

                    symbol:
                        body.symbol,

                    timeframe:
                        body.timeframe ||
                        "5m",

                    mode:
                        body.mode ||
                        "standard"

                });

            if (
                !evaluation.success
            ) {

                return res
                    .status(400)
                    .json({

                        status:
                            "error",

                        ...evaluation

                    });

            }

            signal =
                evaluation;

        }

        const approval =
            await approveSignalForExecution(
                signal,
                body
            );

        return res.json({

            status:
                "success",

            approval,

            signal,

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                false

        });

    }
);


// =====================================================
// PHASE 3 — ENGINE STATUS
// =====================================================

app.get(
    "/api/pcs/status",
    function (req, res) {

        res.json({

            status:
                "success",

            engine:
                "PCS AI",

            version:
                SYSTEM_VERSION,

            enabled:
                PCS_ENGINE_STATE.enabled,

            state:
                {
                    ...PCS_ENGINE_STATE
                },

            execution:
                EXECUTION_STATE.type,

            liveTrading:
                false,

            supportedModes:
                PCS_MODES,

            supportedTimeframes:
                TIMEFRAMES,

            message:
                "PCS AI Phase 3 signal engine is operational."

        });

    }
);

// =====================================================
// PHASE 3 — TRADE JOURNAL — GET
// =====================================================

app.get(
    "/api/trades",
    function (req, res) {

        SYSTEM_STATE.tradeRequests++;

        const limit =
            clamp(
                Math.floor(
                    Number(
                        req.query.limit
                    ) || 50
                ),
                1,
                MAX_TRADE_HISTORY
            );

        let trades =
            TRADE_HISTORY;

        if (
            req.query.symbol
        ) {

            const symbol =
                normalizeSymbol(
                    req.query.symbol
                );

            trades =
                trades.filter(
                    trade =>
                        trade.symbol ===
                        symbol
                );

        }

        if (
            req.query.mode
        ) {

            const mode =
                normalizeMode(
                    req.query.mode
                );

            trades =
                trades.filter(
                    trade =>
                        trade.mode ===
                        mode
                );

        }

        if (
            req.query.status
        ) {

            const status =
                String(
                    req.query.status
                )
                    .trim()
                    .toUpperCase();

            trades =
                trades.filter(
                    trade =>
                        String(
                            trade.status
                        )
                            .toUpperCase() ===
                        status
                );

        }

        trades =
            trades
                .slice(-limit)
                .reverse();

        return res.json({

            status:
                "success",

            count:
                trades.length,

            trades

        });

    }
);


// =====================================================
// PHASE 3 — TRADE JOURNAL — CREATE DEMO TRADE
// =====================================================

app.post(
    "/api/trades",
    async function (req, res) {

        SYSTEM_STATE.tradeRequests++;

        const body =
            req.body || {};

        const symbol =
            normalizeSymbol(
                body.symbol
            );

        const mode =
            normalizeMode(
                body.mode ||
                "standard"
            );

        if (
            !isSupportedMarket(symbol)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported market."

                });

        }

        if (
            !isValidMode(mode)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Unsupported PCS mode."

                });

        }

        const signal =
            normalizeSignal(
                body.side ||
                body.signal
            );

        if (
            signal !== "BUY" &&
            signal !== "SELL"
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Trade side must be BUY or SELL."

                });

        }

        if (
            !isValidNumber(
                body.entry
            )
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Valid entry price is required."

                });

        }

        const trade =
            storeTrade({

                symbol,

                mode,

                execution:
                    "demo",

                side:
                    signal,

                entry:
                    body.entry,

                stopLoss:
                    body.stopLoss,

                takeProfit:
                    body.takeProfit,

                lotSize:
                    body.lotSize,

                status:
                    "OPEN",

                source:
                    body.source ||
                    "PCS",

                metadata:
                    body.metadata ||
                    {}

            });

        ACCOUNT_STATE.openPositions.push({

            tradeId:
                trade.id,

            symbol:
                trade.symbol,

            side:
                trade.side,

            lotSize:
                trade.lotSize,

            entry:
                trade.entry,

            openedAt:
                trade.createdAt

        });

        ACCOUNT_STATE.updatedAt =
            new Date().toISOString();

        return res.json({

            status:
                "success",

            message:
                "Demo trade recorded.",

            execution:
                "demo",

            liveTrading:
                false,

            trade

        });

    }
);


// =====================================================
// PHASE 3 — CLOSE TRADE
// =====================================================

app.post(
    "/api/trades/:id/close",
    function (req, res) {

        const trade =
            TRADE_HISTORY.find(
                item =>
                    item.id ===
                    req.params.id
            );

        if (
            !trade
        ) {

            return res
                .status(404)
                .json({

                    status:
                        "error",

                    message:
                        "Trade not found."

                });

        }

        if (
            trade.status !== "OPEN"
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Trade is already closed."

                });

        }

        const body =
            req.body || {};

        const closePrice =
            Number(
                body.closePrice
            );

        if (
            !isValidNumber(closePrice)
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Valid close price is required."

                });

        }

        trade.status =
            "CLOSED";

        trade.closedAt =
            new Date().toISOString();

        trade.closePrice =
            closePrice;

        if (
            isValidNumber(
                body.profit
            )
        ) {

            trade.profit =
                Number(
                    body.profit
                );

        }

        ACCOUNT_STATE.openPositions =
            ACCOUNT_STATE.openPositions.filter(
                position =>
                    position.tradeId !==
                    trade.id
            );

        ACCOUNT_STATE.updatedAt =
            new Date().toISOString();

        return res.json({

            status:
                "success",

            message:
                "Demo trade closed.",

            trade

        });

    }
);

// =====================================================
// PHASE 3 — EXECUTION ADAPTER STATUS
// =====================================================

app.get(
    "/api/execution/adapter",
    function (req, res) {

        res.json({

            status:
                "success",

            adapter:
                {
                    ...EXECUTION_ADAPTER
                },

            execution:
                EXECUTION_STATE.type,

            liveTradingEnabled:
                false,

            message:
                "Phase 4 execution integration can connect to this adapter."

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

                    `Version: ${SYSTEM_VERSION}\n` +

                    "Status: ONLINE"

                );


            if (
                !result.sent
            ) {

                return res
                    .status(500)
                    .json({

                        status:
                            "error",

                        message:
                            result.reason

                    });

            }


            return res.json({

                status:
                    "success",

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

                    status:
                        "error",

                    message:
                        error.message

                });

        }

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
                EXECUTION_STATE.type === "live"
                    ? "LIVE"
                    : "DEMO ONLY",

            liveTrading:
                EXECUTION_STATE.liveTradingEnabled,

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
// PHASE 3 — QUOTE INGESTION
// =====================================================

app.post(
    "/api/market/quote",
    function (req, res) {

        const quote =
            req.body || {};

        const saved =
            saveMarketQuote(
                quote
            );

        if (
            !saved
        ) {

            return res
                .status(400)
                .json({

                    status:
                        "error",

                    message:
                        "Invalid market quote."

                });

        }

        return res.json({

            status:
                "success",

            message:
                "Market quote accepted.",

            quote:
                getMarketQuote(
                    quote.symbol,
                    quote.timeframe
                )

        });

    }
);


// =====================================================
// 404 HANDLER
// =====================================================

app.use(
    function (req, res) {

        res
            .status(404)
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
    function (error, req, res, next) {

        console.error(
            "PCS AI SERVER ERROR:",
            error
        );

        res
            .status(500)
            .json({

                status:
                    "error",

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
            "Mode Configuration: READY"
        );

        console.log(
            "Market Quote Engine: READY"
        );

        console.log(
            "Candle Engine: READY"
        );

        console.log(
            "PCS Signal Engine: READY"
        );

        console.log(
            "Signal History: READY"
        );

        console.log(
            "Trade Journal: READY"
        );

        console.log(
            "Account Engine: READY"
        );

        console.log(
            "TradingView Connector: READY"
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
            "Execution: DEMO"
        );

        console.log(
            "Live Trading: DISABLED"
        );

        console.log(
            "Phase 3: COMPLETE"
        );

        console.log(
            "Phase 4: READY TO BEGIN"
        );

        console.log(
            "=========================================="
        );

    }
);
