import React, { useState, useEffect } from "react";
import { getAverageStats, getTopCategories } from "../services/api";

export default function Insights({ userId }) {
    const [avg, setAvg] = useState(null);
    const [top, setTop] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [avgRes, topRes] = await Promise.all([
                    getAverageStats(userId),
                    getTopCategories(userId, 3)
                ]);
                setAvg(avgRes.data.data);
                setTop(topRes.data.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [userId]);

    const isOverspending = avg && avg.maxExpense > avg.avgExpense * 3;

    if (loading) return <div className="card"><p className="muted">Computing insights...</p></div>;

    return (
        <div className="card">
            <h2>Advanced Insights</h2>
            <p className="muted">Pipeline: $divide, $multiply, $project — overspend detection</p>

            {avg && Object.keys(avg).length > 0 ? (
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total spent</div>
                        <div className="stat-value">₹{avg.totalSpent?.toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg per expense</div>
                        <div className="stat-value">₹{avg.avgExpense}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Highest expense</div>
                        <div className="stat-value">₹{avg.maxExpense}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Lowest expense</div>
                        <div className="stat-value">₹{avg.minExpense}</div>
                    </div>
                </div>
            ) : (
                <p className="muted">No data yet. Add some expenses to see insights.</p>
            )}

            {isOverspending && (
                <div className="alert alert-danger" style={{ marginTop: "1rem" }}>
                    Overspending detected — your highest expense is 3x above your average.
                </div>
            )}

            {top.length > 0 && (
                <>
                    <h3 style={{ margin: "1.5rem 0 0.75rem" }}>Top 3 Spending Categories</h3>
                    {top.map((t, i) => (
                        <div key={t.category} className="top-item">
                            <span className="rank">#{i + 1}</span>
                            <span className="top-cat">{t.category}</span>
                            <div className="top-bar-wrap">
                                <div className="top-bar" style={{
                                    width: top[0]?.total > 0 ? `${(t.total / top[0].total) * 100}%` : "0%"
                                }} />
                            </div>
                            <strong>₹{t.total.toLocaleString()}</strong>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}