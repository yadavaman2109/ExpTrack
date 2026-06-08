import React, { useState, useEffect, useRef } from "react";
import { getHealthScore, askCoach } from "../services/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AICoach({ month }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [chatHistory, setChatHistory] = useState([
        { role: "model", text: "Hello! I am your JebTrack AI Finance Coach. I have analyzed your transactions, budgets, and savings rate. Ask me any questions about your finances, such as:\n\n* *How can I improve my financial score?*\n* *Explain my anomalies.*\n* *Give me a savings plan.*" }
    ]);
    const [userInput, setUserInput] = useState("");
    const [sendingChat, setSendingChat] = useState(false);
    const [checkedTasks, setCheckedTasks] = useState({});

    const chatEndRef = useRef(null);

    const fetchHealthData = async () => {
        setLoading(true);
        try {
            const r = await getHealthScore(month);
            if (r.data.success) {
                setData(r.data.data);
            }
        } catch (e) {
            console.error("Failed to load health score data:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, [month]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, sendingChat]);

    const handleSendChat = async (msgText) => {
        const textToSend = msgText || userInput;
        if (!textToSend.trim()) return;

        // Clear input
        if (!msgText) setUserInput("");

        // Add to history
        const newUserMsg = { role: "user", text: textToSend };
        const updatedHistory = [...chatHistory, newUserMsg];
        setChatHistory(updatedHistory);
        setSendingChat(true);

        try {
            // Send to backend
            const r = await askCoach(textToSend, chatHistory.map(h => ({ role: h.role, text: h.text })));
            if (r.data.success) {
                setChatHistory(prev => [...prev, { role: "model", text: r.data.message }]);
            }
        } catch (err) {
            console.error("Failed to chat with coach:", err);
            setChatHistory(prev => [...prev, { role: "model", text: "Sorry, I am facing an issue connecting right now. Please try again in a bit!" }]);
        } finally {
            setSendingChat(false);
        }
    };

    const toggleCheck = (idx) => {
        setCheckedTasks(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const getScoreClassification = (score) => {
        if (score >= 80) return { label: "EXCELLENT", color: "var(--green)", bg: "rgba(16, 185, 129, 0.12)", class: "excellent" };
        if (score >= 65) return { label: "GOOD", color: "var(--blue)", bg: "rgba(89, 124, 247, 0.12)", class: "good" };
        if (score >= 50) return { label: "NEEDS WORK", color: "var(--amber)", bg: "rgba(245, 158, 11, 0.12)", class: "warn" };
        return { label: "CRITICAL", color: "var(--red)", bg: "rgba(244, 63, 94, 0.12)", class: "poor" };
    };

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
                <div style={{ textAlign: "center" }}>
                    <div className="splash-logo" style={{ margin: "0 auto 1.5rem" }}>⚡</div>
                    <p style={{ color: "var(--text2)", fontWeight: 550 }}>AI Finance Coach is evaluating your health score...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="empty-state">
                Failed to gather financial data. Ensure you have added expenses and income for this month.
            </div>
        );
    }

    const classif = getScoreClassification(data.score);
    const radius = 45;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (data.score / 100) * circ;

    // Format history for trend chart
    const trendData = (data.history || []).map(h => ({
        month: new Date(h.month + "-02").toLocaleDateString("en-US", { month: "short" }),
        Score: h.score,
        Savings: h.savings,
        Expenses: h.expenses,
        Income: h.income
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Top Score Banner & Metric Breakdown */}
            <div className="coach-grid">
                
                {/* Circular Score Gauge */}
                <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                    <div className="gauge-wrapper">
                        <svg className="gauge-svg" width="160" height="160" viewBox="0 0 100 100">
                            <circle className="gauge-bg" cx="50" cy="50" r={radius} strokeWidth="6" />
                            <circle className="gauge-fill" cx="50" cy="50" r={radius} strokeWidth="6"
                                stroke={classif.color}
                                strokeDashoffset={offset}
                                style={{ strokeDasharray: circ }}
                            />
                        </svg>
                        <div className="gauge-center">
                            <span className="gauge-score" style={{ color: classif.color }}>{data.score}</span>
                            <span className="gauge-label">Score</span>
                            <span className="gauge-status" style={{ color: classif.color, background: classif.bg }}>{classif.label}</span>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, paddingLeft: "1.5rem" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>AI Financial Health Summary</h3>
                        <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: "1.5" }}>
                            {data.explanation}
                        </p>
                    </div>
                </div>

                {/* Score Components */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div className="coach-metric-grid" style={{ margin: 0, height: "100%", gap: "12px" }}>
                        
                        {/* Savings Rate Card */}
                        <div className="coach-metric-card">
                            <div className="coach-metric-header">
                                <span className="coach-metric-title">Savings Rate</span>
                                <span className={`coach-metric-score ${getScoreClassification(data.metrics.savingsRate * 100 * (100/30)).class}`}>
                                    {data.subScores.savingsScore}/40 pts
                                </span>
                            </div>
                            <div className="coach-metric-value">{Math.round(data.metrics.savingsRate * 100)}%</div>
                            <div className="coach-metric-sub">Target: &gt; 30% savings</div>
                            <div className="prog-track" style={{ marginTop: "10px", marginBottom: 0, height: "4px" }}>
                                <div className="prog-fill" style={{ width: `${Math.min(100, (data.metrics.savingsRate * 100 / 30) * 100)}%`, background: "var(--green)" }} />
                            </div>
                        </div>

                        {/* Budget Adherence Card */}
                        <div className="coach-metric-card">
                            <div className="coach-metric-header">
                                <span className="coach-metric-title">Budget Limit</span>
                                <span className={`coach-metric-score ${data.metrics.budgetAdherence <= 90 ? "excellent" : data.metrics.budgetAdherence <= 100 ? "good" : "poor"}`}>
                                    {data.subScores.budgetScore}/30 pts
                                </span>
                            </div>
                            <div className="coach-metric-value">
                                {data.metrics.budgetAdherence > 0 ? `${Math.round(data.metrics.budgetAdherence)}%` : "N/A"}
                            </div>
                            <div className="coach-metric-sub">
                                {data.metrics.budgetAdherence > 0 ? "Utilized this month" : "No budget set"}
                            </div>
                            <div className="prog-track" style={{ marginTop: "10px", marginBottom: 0, height: "4px" }}>
                                <div className="prog-fill" style={{ 
                                    width: `${Math.min(100, data.metrics.budgetAdherence > 0 ? data.metrics.budgetAdherence : 0)}%`, 
                                    background: data.metrics.budgetAdherence > 100 ? "var(--red)" : data.metrics.budgetAdherence > 80 ? "var(--amber)" : "var(--blue)" 
                                }} />
                            </div>
                        </div>

                        {/* Consistency Card */}
                        <div className="coach-metric-card">
                            <div className="coach-metric-header">
                                <span className="coach-metric-title">Spending Spikes</span>
                                <span className={`coach-metric-score ${getScoreClassification(data.metrics.spendingConsistency).class}`}>
                                    {data.subScores.consistencyScore}/20 pts
                                </span>
                            </div>
                            <div className="coach-metric-value">{data.metrics.spendingConsistency / 25 > 0 ? 4 - (data.metrics.spendingConsistency / 25) : 0} Spikes</div>
                            <div className="coach-metric-sub">Fewer spikes = higher score</div>
                            <div className="prog-track" style={{ marginTop: "10px", marginBottom: 0, height: "4px" }}>
                                <div className="prog-fill" style={{ width: `${data.metrics.spendingConsistency}%`, background: "var(--purple)" }} />
                            </div>
                        </div>

                        {/* Debt Ratio Card */}
                        <div className="coach-metric-card">
                            <div className="coach-metric-header">
                                <span className="coach-metric-title">EMI/Debt Ratio</span>
                                <span className={`coach-metric-score ${getScoreClassification(100 - (data.metrics.debtRatio * 100 * (100/30))).class}`}>
                                    {data.subScores.debtScore}/10 pts
                                </span>
                            </div>
                            <div className="coach-metric-value">{Math.round(data.metrics.debtRatio * 100)}%</div>
                            <div className="coach-metric-sub">EMI of salary. Limit &lt; 30%</div>
                            <div className="prog-track" style={{ marginTop: "10px", marginBottom: 0, height: "4px" }}>
                                <div className="prog-fill" style={{ width: `${Math.min(100, (data.metrics.debtRatio * 100 / 30) * 100)}%`, background: "var(--red)" }} />
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Dashboard Analytics & Interactive Chat Coach */}
            <div className="coach-grid">
                
                {/* Left side: AI Insights Accordions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    
                    {/* Anomalies alert banner if any */}
                    {data.anomalies && data.anomalies.length > 0 && data.anomalies[0] !== "No major spending spikes detected this month." && (
                        <div className="budget-alert danger" style={{ margin: 0 }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" x2="12" y1="8" y2="12"/>
                                <line x1="12" x2="12.01" y1="16" y2="16"/>
                            </svg>
                            <div>
                                <strong style={{ display: "block", fontSize: "13px" }}>Spending Anomaly Warnings</strong>
                                <ul style={{ marginLeft: "1rem", marginTop: "4px", fontSize: "12px", color: "#fecdd3" }}>
                                    {data.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Savings Opportunities Checklist */}
                    <div className="glass-card">
                        <h3 className="card-title">AI Savings Opportunities Checklist</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {data.savingsOpportunities.map((op, idx) => (
                                <div key={idx}
                                    className={`checklist-item ${checkedTasks[idx] ? "checked" : ""}`}
                                    onClick={() => toggleCheck(idx)}
                                >
                                    <div className="checklist-checkbox">
                                        {checkedTasks[idx] && (
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span>{op}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Budget & Forecast Matrix */}
                    <div className="glass-card">
                        <h3 className="card-title">Optimized Budget & Forecasts</h3>
                        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "1rem" }}>
                            {data.spendingSummary}
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <strong style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text3)", letterSpacing: "0.5px" }}>Recommended Targets</strong>
                            <ul style={{ marginLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                                {data.budgetRecommendations.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>

                        <div className="forecast-card-grid">
                            <div className="forecast-card">
                                <h4>Forecasted Expense</h4>
                                <span>₹{data.forecasts.nextMonthExpense.toLocaleString()}</span>
                            </div>
                            <div className="forecast-card">
                                <h4>Predicted Savings</h4>
                                <span style={{ color: data.forecasts.predictedSavings >= 0 ? "var(--green)" : "var(--red)" }}>
                                    ₹{data.forecasts.predictedSavings.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right side: Historical trend & Chatbot widget */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    
                    {/* Recharts Area Chart for score history */}
                    <div className="glass-card" style={{ paddingBottom: "1rem" }}>
                        <h3 className="card-title">Financial Health Score Trend</h3>
                        <div style={{ width: "100%", height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--pink)" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="var(--pink)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="var(--text3)" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} stroke="var(--text3)" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: "#141519", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px" }}
                                        labelStyle={{ fontWeight: "bold", color: "#fff" }}
                                    />
                                    <Area type="monotone" dataKey="Score" stroke="var(--pink)" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Chatbot Interface */}
                    <div className="chat-widget">
                        <h3 className="card-title" style={{ marginBottom: "12px" }}>AI Finance Coach</h3>
                        
                        <div className="chat-history">
                            {chatHistory.map((m, idx) => (
                                <div key={idx} className={`chat-msg ${m.role === "model" ? "coach" : "user"}`}>
                                    <div dangerouslySetInnerHTML={{ 
                                        __html: m.text
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                            .replace(/\n/g, '<br/>')
                                    }} />
                                </div>
                            ))}
                            {sendingChat && (
                                <div className="chat-msg coach" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ fontSize: "12px", color: "var(--text3)" }}>Thinking...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Fast click prompts tags */}
                        <div className="chat-tags">
                            <button className="chat-tag" onClick={() => handleSendChat("How can I improve my financial score?")}>
                                Boost Score
                            </button>
                            <button className="chat-tag" onClick={() => handleSendChat("Analyze my spending spikes")}>
                                Explain Spikes
                            </button>
                            <button className="chat-tag" onClick={() => handleSendChat("Can I afford a big purchase?")}>
                                Budget Check
                            </button>
                        </div>

                        {/* Text input area */}
                        <form className="chat-input-area" onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}>
                            <input 
                                type="text"
                                placeholder="Ask about your finances, budget, or saving..."
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                disabled={sendingChat}
                            />
                            <button className="chat-send-btn" type="submit" disabled={sendingChat || !userInput.trim()}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </button>
                        </form>
                    </div>

                </div>

            </div>

        </div>
    );
}
