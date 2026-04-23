import React, { useState, useEffect } from "react";
import {
    getOverview,
    getCategoryAnalytics,
    getMonthlyAnalytics
} from "../services/api";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell
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
                <p key={p.name} style={{ color: p.color, margin: "3px 0" }}>
                    {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
                </p>
            ))}
        </div>
    );
};

export default function Overview() {
    const [ov, setOv] = useState(null);
    const [cats, setCats] = useState([]);
    const [monthly, setMonthly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getOverview(),
            getCategoryAnalytics(),
            getMonthlyAnalytics()
        ]).then(([ovRes, catRes, monRes]) => {
            setOv(ovRes.data.data);
            setCats(catRes.data.data);
            // Reverse so oldest month is on the left
            setMonthly([...monRes.data.data].reverse());
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    // Format month "2026-04" → "Apr 26"
    const fmtMonth = (m) => {
        if (!m) return "";
        const [y, mo] = m.split("-");
        const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${names[parseInt(mo) - 1]} ${y.slice(2)}`;
    };

    const chartData = monthly.map(m => ({
        month: fmtMonth(m.month),
        Income: m.totalIncome || 0,
        Expenses: m.totalSpent || 0,
        Balance: (m.totalIncome || 0) - (m.totalSpent || 0)
    }));

    const totalCat = cats.reduce((s, c) => s + c.total, 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* ── KPI Cards ── */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
            }}>
                {[
                    { label: "Total Income", val: ov?.totalIncome, color: "#10b981", icon: "↑" },
                    { label: "Total Expenses", val: ov?.total, color: "#ef4444", icon: "↓" },
                    {
                        label: "Net Balance", val: ov?.netBalance,
                        color: (ov?.netBalance ?? 0) >= 0 ? "#3b82f6" : "#f59e0b", icon: "⇌"
                    },
                    {
                        label: "Transactions", val: ov?.count, color: "#8b5cf6", icon: "#",
                        noRupee: true
                    },
                ].map(k => (
                    <div key={k.label} style={{
                        background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, padding: "1.25rem",
                        borderTop: `3px solid ${k.color}`
                    }}>
                        <div style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", marginBottom: 12
                        }}>
                            <span style={{
                                fontSize: 12, color: "#8b949e", textTransform: "uppercase",
                                letterSpacing: ".5px"
                            }}>{k.label}</span>
                            <span style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: k.color + "22", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontSize: 14, color: k.color
                            }}>{k.icon}</span>
                        </div>
                        <div style={{
                            fontSize: 28, fontWeight: 600, color: k.color,
                            fontFamily: "'DM Mono', monospace"
                        }}>
                            {k.noRupee ? "" : "₹"}{k.val?.toLocaleString("en-IN") ?? "0"}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Area Chart ── */}
            <div style={{
                background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "1.5rem"
            }}>
                <h3 style={{
                    fontSize: 12, fontWeight: 500, color: "#8b949e",
                    textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "1.25rem"
                }}>Income vs Expenses — Monthly Trend</h3>

                {chartData.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#6e7681", padding: "3rem" }}>
                        No data yet — add income and expenses to see the chart
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="month" tick={{ fill: "#6e7681", fontSize: 12 }}
                                axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#6e7681", fontSize: 11 }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: 13, color: "#8b949e", paddingTop: 16 }} />
                            <Area type="monotone" dataKey="Income"
                                stroke="#10b981" strokeWidth={2.5}
                                fill="url(#colorIncome)" dot={{ fill: "#10b981", r: 4 }}
                                activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="Expenses"
                                stroke="#ef4444" strokeWidth={2.5}
                                fill="url(#colorExpenses)" dot={{ fill: "#ef4444", r: 4 }}
                                activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="Balance"
                                stroke="#3b82f6" strokeWidth={2}
                                fill="url(#colorBalance)" dot={{ fill: "#3b82f6", r: 3 }}
                                activeDot={{ r: 5 }} strokeDasharray="5 3" />
                        </AreaChart>
                    </ResponsiveContainer>
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
                    }}>Spending by Category</h3>

                    {cats.length === 0 ? (
                        <p style={{
                            color: "#6e7681", fontSize: 13, textAlign: "center",
                            padding: "2rem 0"
                        }}>No expense data yet</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={cats} layout="vertical"
                                margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3"
                                    stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: "#6e7681", fontSize: 11 }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                <YAxis type="category" dataKey="category"
                                    tick={{ fill: "#8b949e", fontSize: 12 }}
                                    axisLine={false} tickLine={false} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Spent" radius={[0, 4, 4, 0]}>
                                    {cats.map((c, i) => (
                                        <Cell key={i}
                                            fill={CAT_COLORS[c.category] || "#6b7280"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Category List with % */}
                <div style={{
                    background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: "1.5rem"
                }}>
                    <h3 style={{
                        fontSize: 12, fontWeight: 500, color: "#8b949e",
                        textTransform: "uppercase", letterSpacing: ".5px", marginBottom: "1.25rem"
                    }}>Category Breakdown</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {cats.slice(0, 6).map(c => (
                            <div key={c.category}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    marginBottom: 5, fontSize: 13
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: "50%",
                                            background: CAT_COLORS[c.category] || "#888",
                                            flexShrink: 0
                                        }} />
                                        <span style={{ color: "#e6edf3" }}>{c.category}</span>
                                        <span style={{ color: "#6e7681", fontSize: 11 }}>
                                            ({c.count})
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <span style={{ color: "#8b949e", fontSize: 12 }}>
                                            {totalCat > 0
                                                ? ((c.total / totalCat) * 100).toFixed(1) : 0}%
                                        </span>
                                        <span style={{
                                            color: "#e6edf3", fontWeight: 500,
                                            fontFamily: "'DM Mono', monospace", fontSize: 13
                                        }}>
                                            ₹{c.total.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    height: 5, background: "#1c2128",
                                    borderRadius: 3, overflow: "hidden"
                                }}>
                                    <div style={{
                                        height: "100%", borderRadius: 3,
                                        width: totalCat > 0
                                            ? `${(c.total / totalCat) * 100}%` : "0%",
                                        background: CAT_COLORS[c.category] || "#888",
                                        transition: "width .6s ease"
                                    }} />
                                </div>
                            </div>
                        ))}
                        {cats.length === 0 && (
                            <p style={{
                                color: "#6e7681", fontSize: 13,
                                textAlign: "center", padding: "2rem 0"
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