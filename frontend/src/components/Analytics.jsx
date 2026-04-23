import React, { useState, useEffect } from "react";
import { getCategoryAnalytics, getDailyAnalytics, getTopCategories } from "../services/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, Legend
} from "recharts";

const CAT_COLORS = {
    Food: "#f59e0b", Travel: "#3b82f6", Shopping: "#ec4899",
    Health: "#10b981", Entertainment: "#8b5cf6", Bills: "#ef4444",
    Education: "#06b6d4", Other: "#6b7280"
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "#1c2128", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "10px 14px", fontSize: 13
        }}>
            <p style={{ color: "#8b949e", marginBottom: 6 }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color || "#e6edf3", margin: "3px 0" }}>
                    {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
                </p>
            ))}
        </div>
    );
};

export default function Analytics({ month }) {
    const [cats, setCats] = useState([]);
    const [daily, setDaily] = useState([]);
    const [top, setTop] = useState([]);

    useEffect(() => {
        getCategoryAnalytics(month).then(r => setCats(r.data.data)).catch(() => { });
        getDailyAnalytics(month).then(r => setDaily(r.data.data)).catch(() => { });
        getTopCategories().then(r => setTop(r.data.data)).catch(() => { });
    }, [month]);

    const avgDay = daily.length
        ? daily.reduce((s, d) => s + d.total, 0) / daily.length : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* ── Daily Spending Line Chart ── */}
            <div style={{
                background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "1.5rem"
            }}>
                <h3 style={{
                    fontSize: 12, fontWeight: 500, color: "#8b949e",
                    textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "1.25rem"
                }}>Daily Spending — {month}</h3>

                {daily.length === 0 ? (
                    <p style={{ color: "#6e7681", textAlign: "center", padding: "3rem" }}>
                        No data for {month}
                    </p>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={daily}
                                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="day"
                                    tick={{ fill: "#6e7681", fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                    label={{
                                        value: "Day of month", position: "insideBottom",
                                        offset: -2, fill: "#6e7681", fontSize: 11
                                    }} />
                                <YAxis tick={{ fill: "#6e7681", fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v =>
                                        `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="total" name="Spent"
                                    stroke="#3b82f6" strokeWidth={2.5}
                                    dot={({ cx, cy, payload }) => (
                                        <circle key={cx} cx={cx} cy={cy} r={4}
                                            fill={payload.total > avgDay * 1.5 ? "#ef4444" : "#3b82f6"}
                                            stroke="none" />
                                    )}
                                    activeDot={{ r: 6, fill: "#3b82f6" }} />
                            </LineChart>
                        </ResponsiveContainer>
                        <p style={{ fontSize: 11, color: "#6e7681", marginTop: 8 }}>
                            Red dots = days above 1.5× daily average
                            (avg: ₹{avgDay.toFixed(0)})
                        </p>
                    </>
                )}
            </div>

            {/* ── Bottom Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

                {/* Category Bar Chart */}
                <div style={{
                    background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: "1.5rem"
                }}>
                    <h3 style={{
                        fontSize: 12, fontWeight: 500, color: "#8b949e",
                        textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "1.25rem"
                    }}>Category Breakdown — {month}</h3>

                    {cats.length === 0 ? (
                        <p style={{ color: "#6e7681", textAlign: "center", padding: "2rem" }}>
                            No data for {month}
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={cats}
                                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="category"
                                    tick={{ fill: "#6e7681", fontSize: 10 }}
                                    axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: "#6e7681", fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v =>
                                        `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Spent" radius={[4, 4, 0, 0]}>
                                    {cats.map((c, i) => (
                                        <Cell key={i} fill={CAT_COLORS[c.category] || "#6b7280"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Top 5 All-Time */}
                <div style={{
                    background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: "1.5rem"
                }}>
                    <h3 style={{
                        fontSize: 12, fontWeight: 500, color: "#8b949e",
                        textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "1.25rem"
                    }}>Top 5 Categories (All Time)</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {top.map((t, i) => (
                            <div key={t.category}>
                                <div style={{
                                    display: "flex", alignItems: "center",
                                    gap: 10, marginBottom: 6
                                }}>
                                    <span style={{
                                        width: 22, height: 22, borderRadius: "50%",
                                        background: "#1c2128", display: "flex",
                                        alignItems: "center", justifyContent: "center",
                                        fontSize: 11, fontWeight: 600, color: "#8b949e",
                                        flexShrink: 0
                                    }}>#{i + 1}</span>
                                    <span style={{ flex: 1, fontSize: 13, color: "#e6edf3" }}>
                                        {t.category}
                                    </span>
                                    <span style={{
                                        fontSize: 13, fontWeight: 600,
                                        fontFamily: "'DM Mono', monospace",
                                        color: CAT_COLORS[t.category] || "#e6edf3"
                                    }}>
                                        ₹{t.total.toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div style={{
                                    height: 5, background: "#1c2128",
                                    borderRadius: 3, overflow: "hidden"
                                }}>
                                    <div style={{
                                        height: "100%", borderRadius: 3,
                                        width: top[0]?.total > 0
                                            ? `${(t.total / top[0].total) * 100}%` : "0%",
                                        background: CAT_COLORS[t.category] || "#888",
                                        transition: "width .6s ease"
                                    }} />
                                </div>
                            </div>
                        ))}
                        {top.length === 0 && (
                            <p style={{
                                color: "#6e7681", textAlign: "center",
                                fontSize: 13, padding: "2rem 0"
                            }}>
                                No data yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}