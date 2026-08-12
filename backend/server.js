const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===============================
// PCS AI BACKEND
// ===============================

app.get("/", (req, res) => {
    res.json({
        status: "online",
        system: "PCS AI",
        version: "2.0",
        message: "PCS AI backend is running"
    });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        marketData: "pending",
        tradingView: "pending",
        mt5: "pending",
        memory: "ready",
        tradeHistory: "ready"
    });
});

// ===============================
// MARKET ENDPOINT
// ===============================

app.get("/api/market", (req, res) => {

    const symbol = req.query.symbol || "XAUUSD";

    res.json({
        symbol: symbol,
        price: null,
        timeframe: req.query.timeframe || "5m",
        source: "pending",
        status: "waiting_for_market_data"
    });
});

// ===============================
// PCS SIGNAL ENDPOINT
// ===============================

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
        received: true,
        signal: {
            symbol: symbol || null,
            timeframe: timeframe || null,
            direction: direction || "WAIT",
            confidence: confidence || 0,
            entry: entry || null,
            stopLoss: stopLoss || null,
            takeProfit: takeProfit || null
        }
    });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `PCS AI backend running on port ${PORT}`
    );

});
