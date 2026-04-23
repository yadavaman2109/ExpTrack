import React, { useState, useEffect } from "react";
import { setBudget, getBudgetStatus } from "../services/api";

const CATS = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"];

export default function BudgetManager({ month }) {
    const [status, setStatus] = useState(null);
    const [totalBudget, setTotal] = useState("");
    const [catBudgets, setCat] = useState(
        CATS.reduce((o, c) => ({ ...o, [c]: "" }), {})
    );

    const fetchStatus = async () => {
        try {
            const r = await getBudgetStatus(month);
            setStatus(r.data.data);
        } catch { setStatus(null); }
    };

    useEffect(() => { fetchStatus(); }, [month]);

    const handleSet = async () => {
        if (!totalBudget) return;
        try {
            await setBudget({
                month,
                totalBudget: parseFloat(totalBudget),
                categoryBudgets: CATS
                    .filter(c => catBudgets[c])
                    .map(c => ({ category: c, budget: parseFloat(catBudgets[c]) }))
            });
            fetchStatus();
        } catch (e) { console.error(e); }
    };

    return (
        <div>
            <div className="glass-card" style={{ marginBottom: "1.25rem" }}>
                <h3 className="card-title">Set Monthly Budget — {month}</h3>
                <div className="field" style={{ maxWidth: 320, marginBottom: "1rem" }}>
                    <label>Total monthly budget (₹)</label>
                    <input type="number" placeholder="e.g. 30000"
                        value={totalBudget} onChange={e => setTotal(e.target.value)} />
                </div>
                <div className="cat-budget-grid">
                    {CATS.map(c => (
                        <div key={c} className="field">
                            <label>{c}</label>
                            <input type="number" placeholder="₹"
                                value={catBudgets[c]}
                                onChange={e => setCat({ ...catBudgets, [c]: e.target.value })} />
                        </div>
                    ))}
                </div>
                <button className="btn-primary" style={{ marginTop: "1rem" }}
                    onClick={handleSet}>
                    Save Budget
                </button>
            </div>

            {status ? (
                <div className="glass-card">
                    <h3 className="card-title">Budget Status</h3>
                    {status.alert && (
                        <div className={`budget-alert ${status.isOverBudget ? "danger" : "warn"}`}>
                            {status.alert}
                        </div>
                    )}
                    <div className="budget-overview">
                        <div className="budget-num">
                            <span>₹{status.totalSpent.toLocaleString()}</span>
                            <small>spent</small>
                        </div>
                        <div className="budget-num">
                            <span>₹{status.totalBudget.toLocaleString()}</span>
                            <small>budget</small>
                        </div>
                        <div className="budget-num"
                            style={{ color: status.remaining >= 0 ? "#10b981" : "#ef4444" }}>
                            <span>₹{Math.abs(status.remaining).toLocaleString()}</span>
                            <small>{status.remaining >= 0 ? "remaining" : "over"}</small>
                        </div>
                    </div>
                    <div className="prog-track">
                        <div className="prog-fill" style={{
                            width: `${Math.min(100, status.utilizationPct)}%`,
                            background: status.isOverBudget ? "#ef4444"
                                : status.utilizationPct > 80 ? "#f59e0b" : "#10b981"
                        }} />
                    </div>
                    <p className="prog-pct">{status.utilizationPct}% used</p>

                    <div className="cat-status-list">
                        {status.categoryStatus.map(cs => (
                            <div key={cs.category} className="cs-row">
                                <span className="cs-name">{cs.category}</span>
                                <div className="cs-bar">
                                    <div className="cs-fill" style={{
                                        width: cs.budget > 0
                                            ? `${Math.min(100, (cs.spent / cs.budget) * 100)}%` : "0%",
                                        background: cs.isOver ? "#ef4444" : "#3b82f6"
                                    }} />
                                </div>
                                <span className={`cs-amt ${cs.isOver ? "over" : ""}`}>
                                    ₹{cs.spent} / ₹{cs.budget}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    No budget set for {month} yet. Enter amounts above and click Save Budget.
                </div>
            )}
        </div>
    );
}