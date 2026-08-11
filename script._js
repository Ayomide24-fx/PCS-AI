document.getElementById("analyze").onclick = function() {

    // =========================
    // PCS CONDITIONS
    // =========================

    var trend =
        document.getElementById("trend").value;

    var pcs =
        document.getElementById("pcs").value;

    var heiken =
        document.getElementById("heiken").value;

    var support =
        document.getElementById("support").value;


    // =========================
    // TRADE DATA
    // =========================

    var balance =
        Number(
            document.getElementById("balance").value
        );

    var risk =
        Number(
            document.getElementById("risk").value
        );

    var entry =
        Number(
            document.getElementById("entry").value
        );

    var stop =
        Number(
            document.getElementById("stop").value
        );

    var takeProfit =
        Number(
            document.getElementById("takeProfit").value
        );

    var value =
        Number(
            document.getElementById("value").value
        );


    // =========================
    // VALIDATION
    // =========================

    if (
        balance <= 0 ||
        risk <= 0 ||
        entry <= 0 ||
        stop <= 0 ||
        takeProfit <= 0 ||
        value <= 0
    ) {

        alert(
            "Please complete all trade fields."
        );

        return;
    }


    // =========================
    // CALCULATIONS
    // =========================

    var riskAmount =
        balance * risk / 100;

    var stopDistance =
        Math.abs(entry - stop);

    var rewardDistance =
        Math.abs(takeProfit - entry);


    if (stopDistance === 0) {

        alert(
            "Entry and Stop Loss cannot be the same."
        );

        return;
    }


    if (rewardDistance === 0) {

        alert(
            "Entry and Take Profit cannot be the same."
        );

        return;
    }


    var positionSize =
        riskAmount /
        (stopDistance * value);

    var riskReward =
        rewardDistance /
        stopDistance;


    // =========================
    // DISPLAY RESULTS
    // =========================

    document.getElementById("riskResult").innerHTML =
        "$" + riskAmount.toFixed(2);

    document.getElementById("distanceResult").innerHTML =
        stopDistance.toFixed(2);

    document.getElementById("positionResult").innerHTML =
        positionSize.toFixed(4);

    document.getElementById("rewardResult").innerHTML =
        rewardDistance.toFixed(2);

    document.getElementById("rrResult").innerHTML =
        "1:" + riskReward.toFixed(2);


    // =========================
    // RISK LEVEL
    // =========================

    var riskLevel =
        document.getElementById("riskLevel");


    if (risk <= 2) {

        riskLevel.innerHTML = "LOW";

        riskLevel.style.color = "#00ff88";

    } else if (risk <= 5) {

        riskLevel.innerHTML = "MEDIUM";

        riskLevel.style.color = "#ffd166";

    } else {

        riskLevel.innerHTML = "HIGH";

        riskLevel.style.color = "#ff4d6d";
    }


    // =========================
    // TREND DISPLAY
    // =========================

    var trendDisplay =
        document.getElementById("trendDisplay");


    if (trend === "bullish") {

        trendDisplay.innerHTML =
            "▲ BULLISH";

        trendDisplay.className =
            "bullish";

    } else {

        trendDisplay.innerHTML =
            "▼ BEARISH";

        trendDisplay.className =
            "bearish";
    }


    // =========================
    // CONFIDENCE SCORE
    // =========================

    var confidence = 0;


    // Trend
    if (trend === "bullish" || trend === "bearish") {
        confidence += 20;
    }


    // PCS
    if (pcs === "yes") {
        confidence += 20;
    }


    // Heiken Ashi
    if (heiken === "yes") {
        confidence += 20;
    }


    // Support / Resistance
    if (support === "yes") {
        confidence += 20;
    }


    // Risk / Reward
    if (riskReward >= 2) {
        confidence += 20;
    }


    // Display confidence

    document.getElementById(
        "confidenceValue"
    ).innerHTML =
        confidence + "%";


    document.getElementById(
        "confidenceFill"
    ).style.width =
        confidence + "%";


    var confidenceStatus =
        document.getElementById(
            "confidenceStatus"
        );


    if (confidence >= 100) {

        confidenceStatus.innerHTML =
            "🟢 VERY STRONG";

    } else if (confidence >= 80) {

        confidenceStatus.innerHTML =
            "🟢 STRONG";

    } else if (confidence >= 60) {

        confidenceStatus.innerHTML =
            "🟡 MODERATE";

    } else if (confidence >= 40) {

        confidenceStatus.innerHTML =
            "🟠 WEAK";

    } else {

        confidenceStatus.innerHTML =
            "🔴 VERY WEAK";
    }


    // =========================
    // SIGNAL
    // =========================

    var signal =
        document.getElementById("signal");

    var reason =
        document.getElementById("reason");


    // =========================
    // RISK ABOVE 5%
    // =========================

    if (risk > 5) {

        signal.innerHTML =
            "🟡 WAIT";

        signal.style.color =
            "#ffd166";

        reason.innerHTML =
            "Risk is above 5%. Trade rejected by risk management.";

    }


    // =========================
    // BULLISH PCS
    // =========================

    else if (

        trend === "bullish" &&
        pcs === "yes" &&
        heiken === "yes" &&
        support === "yes" &&
        riskReward >= 2

    ) {

        signal.innerHTML =
            "🟢 LONG";

        signal.style.color =
            "#00ff88";


        if (risk <= 2) {

            reason.innerHTML =
                "All bullish PCS conditions confirmed. Risk level: LOW.";

        } else {

            reason.innerHTML =
                "Bullish PCS confirmed. ⚠️ Risk level: MEDIUM.";
        }

    }


    // =========================
    // BEARISH PCS
    // =========================

    else if (

        trend === "bearish" &&
        pcs === "yes" &&
        heiken === "yes" &&
        support === "yes" &&
        riskReward >= 2

    ) {

        signal.innerHTML =
            "🔴 SHORT";

        signal.style.color =
            "#ff4d6d";


        if (risk <= 2) {

            reason.innerHTML =
                "All bearish PCS conditions confirmed. Risk level: LOW.";

        } else {

            reason.innerHTML =
                "Bearish PCS confirmed. ⚠️ Risk level: MEDIUM.";
        }

    }


    // =========================
    // WAIT
    // =========================

    else {

        signal.innerHTML =
            "🟡 WAIT";

        signal.style.color =
            "#ffd166";

        reason.innerHTML =
            "PCS conditions are not fully confirmed.";
    }

};
