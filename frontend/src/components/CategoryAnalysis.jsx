import React, { useState, useEffect } from "react";
import { getCategoryAnalytics } from "../services/api";

const COLORS = {
    Food: "#1D9E75", Travel: "#378ADD", Shopping: "#D4537E",
    Health: "#BA7517", Entertainment: "#7F77DD", Other: "#888780"
};

export default function CategoryAnalysis({ userId, month }) {
    const [data, setData] = useState([]);
    const [top, setTop] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await getCategoryAnalytics(userId, month);
                setData(res.data.data);
                setTop(res.data.topCategory);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        })();
    }, [userId, month]);

    const total = data.reduce((s, d) => s + d.total, 0);

    return (
        <div className="card">
            <h2>Category Analysis</h2>
            <p className="muted">Aggregation: $unwind → $group → $sort → $project (renames _id to category)</p>

            {top && (
                <div className="highlight-box">
                    <span>Top category: <strong>{top.category}</strong></span>
                    <span>₹{top.total.toLocaleString()} ({total > 0 ? ((top.total / total) * 100).toFixed(1) : 0}%)</span>
                </div>
            )}

            {loading ? <p className="muted">Loading...</p> : (
                <div className="cat-list">
                    {data.map(d => (
                        <div key={d.category} className="cat-row">
                            <div className="cat-info">
                                <span className="cat-dot" style={{ background: COLORS[d.category] || "#888" }} />
                                <span>{d.category}</span>
                                <span className="muted">({d.count})</span>
                            </div>
                            <div className="cat-bar-wrap">
                                <div className="cat-bar" style={{
                                    width: total > 0 ? `${(d.total / total) * 100}%` : "0%",
                                    background: COLORS[d.category] || "#888"
                                }} />
                            </div>
                            <div className="cat-amount">
                                <strong>₹{d.total.toLocaleString()}</strong>
                                <span className="muted">{total > 0 ? ((d.total / total) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <p style={{ color: "#999", textAlign: "center", padding: "2rem" }}>
                            No category data yet.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}