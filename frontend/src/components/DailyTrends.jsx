import React, { useState, useEffect } from "react";
import { getDailyAnalytics } from "../services/api";

export default function DailyTrends({ userId, month }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await getDailyAnalytics(userId, month);
                setData(res.data.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [userId, month]);

    const max = data.length ? Math.max(...data.map(d => d.total)) : 1;
    const avg = data.length ? data.reduce((s, d) => s + d.total, 0) / data.length : 0;
    const highDays = data.filter(d => d.total > avg * 1.5);

    return (
        <div className="card">
            <h2>Daily Spending Trends — {month}</h2>
            <p className="muted">Aggregation: $dayOfMonth + $group + $match — red bars = high spend days</p>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Active days</div>
                    <div className="stat-value">{data.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Daily average</div>
                    <div className="stat-value">₹{avg.toFixed(0)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">High-spend days</div>
                    <div className="stat-value">{highDays.length}</div>
                </div>
            </div>

            {loading ? <p className="muted">Loading...</p> : (
                <>
                    <div className="daily-chart">
                        {data.map(d => (
                            <div key={d.day} className="daily-col" title={`Day ${d.day}: ₹${d.total}`}>
                                <div className="daily-bar" style={{
                                    height: `${Math.max(4, (d.total / max) * 120)}px`,
                                    background: d.total > avg * 1.5 ? "#E24B4A" : "#1D9E75"
                                }} />
                                <div className="daily-label">{d.day}</div>
                            </div>
                        ))}
                    </div>
                    {highDays.length > 0 && (
                        <p className="warn-text">
                            High-spend days: {highDays.map(d => `Day ${d.day} (₹${d.total})`).join(", ")}
                        </p>
                    )}
                    {data.length === 0 && (
                        <p style={{ color: "#999", textAlign: "center", padding: "1rem" }}>
                            No daily data for {month} yet.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}