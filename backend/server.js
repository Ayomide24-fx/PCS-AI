const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================================================
// PCS AI BACKEND
// =====================================================

const SYSTEM_VERSION = "2.1";

// Supported markets
const MARKETS = [
    "XAUUSD",
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "BTCUSD",
    "NAS100",
    "US30"
];

// Supported timeframes
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
// ROOT
// =====================================================

app.get("/", (req, res) => {

    res.json({
        status: "online",
        system: "PCS AI",
        version: SYSTEM_VERSION,
        message: "PCS AI backend is running"
    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {

    res.json({

        status: "online",

        system: "PCS AI",

        version: SYSTEM_VERSION,

        marketData: "pending",

        tradingView: "pending",

        mt5: "pending",

        memory: "ready",

        tradeHistory: "ready",

        tradingExecution: "disabled"

    });

});


// =====================================================
// AVAILABLE MARKETS
// =====================================================

app.get("/api/markets", (req, res) => {

    res.json({

        status: "success",

        markets: MARKETS,

        timeframes: TIMEFRAMES

    });

});


// =====================================================
// MARKET DATA
// =====================================================

app.get("/api/market", (req, res) => {

    const symbol =
        String(req.query.symbol || "XAUUSD").toUpperCase();

    const timeframe =
        String(req.query.timeframe || "5m");

    // Validate market

    if (!MARKETS.includes(symbol)) {

        return res.status(400).json({

            status: "error",

            message: "Unsupported market",

            supportedMarkets: MARKETS

        });

    }


    // Validate timeframe

    if (!TIMEFRAMES.includes(timeframe)) {

        return res.status(400).json({

            status: "error",

            message: "Unsupported timeframe",

            supportedTimeframes: TIMEFRAMES

        });

    }


    // Real market-data connection will be added later.

    res.json({

        status: "pending",

        symbol: symbol,

        timeframe: timeframe,

        price: null,

        bid: null,

        ask: null,

        source: "TradingView",

        connection: "pending",

        message: "Waiting for real market data"

    });

});


// =====================================================
// PCS SIGNAL
// =====================================================

app.post("/api/signal", (req, res) => {

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

            symbol: symbol || null,

            timeframe: timeframe || null,

            direction: direction || "WAIT",

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

});


// =====================================================
// PCS ANALYSIS STATUS
// =====================================================

app.get("/api/analysis/status", (req, res) => {

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

});


// =====================================================
// TRADING STATUS
// =====================================================

app.get("/api/trading/status", (req, res) => {

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

            maxPositionsPerPair: "multiple"

        },

        adaptiveLotSizing: "planned"

    });

});


// =====================================================
// TRADE HISTORY
// =====================================================

app.get("/api/trades/history", (req, res) => {

    res.json({

        status: "success",

        count: 0,

        trades: []

    });

});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(
        `PCS AI backend v${SYSTEM_VERSION} running on port ${PORT}`
    );

});
