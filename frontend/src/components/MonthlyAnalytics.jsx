import React, { useState, useEffect } from "react";
import { getMonthlyAnalytics } from "../services/api";

export default function MonthlyAnalytics({ userId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await getMonthlyAnalytics(userId);
                setData(res.data.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [userId]);

    const max = data.length ? Math.max(...data.map(d => d.totalSpent)) : 1;

    return (
        <div className="card">
            <h2>Monthly Analytics</h2>
            <p className="muted">Aggregation: $group + $sum + $sort — sorted by highest spending</p>

            {loading ? <p className="muted">Loading...</p> : (
                <>
                    <div className="stat-grid">
                        {data.slice(0, 4).map(d => (
                            <div key={d.month} className="stat-card">
                                <div className="stat-label">{d.month}</div>
                                <div className="stat-value">₹{d.totalSpent.toLocaleString()}</div>
                                <div className="stat-sub">{d.expenseCount} transactions</div>
                            </div>
                        ))}
                    </div>

                    <div className="bar-chart">
                        {data.map(d => (
                            <div key={d.month} className="bar-row">
                                <span className="bar-label">{d.month}</span>
                                <div className="bar-track">
                                    <div className="bar-fill"
                                        style={{ width: `${(d.totalSpent / max) * 100}%` }} />
                                </div>
                                <span className="bar-value">₹{d.totalSpent.toLocaleString()}</span>
                            </div>
                        ))}
                        {data.length === 0 && (
                            <p style={{ color: "#999", textAlign: "center", padding: "2rem" }}>
                                No data yet. Add some expenses first.
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}