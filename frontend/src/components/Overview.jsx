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
    Health: "#10b981", Entertainment: "#8b5cf6", Bills: "#f43f5e",
    Education: "#06b6d4", Other: "#64748b"
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: "rgba(16, 20, 35, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(8px)"
        }}>
            <p style={{ color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color, margin: "4px 0", display: "flex", gap: 10, justifyContent: "space-between" }}>
                    <span>{p.name}:</span>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>₹{Number(p.value).toLocaleString("en-IN")}</span>
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
            setMonthly([...monRes.data.data].reverse());
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

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

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", color: "var(--text2)" }}>
                Loading overview data...
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* ── KPI Cards ── */}
            <div className="kpi-grid">
                {[
                    { 
                        label: "Total Income", 
                        val: ov?.totalIncome, 
                        color: "var(--green)", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="19" y2="5"/>
                                <polyline points="5 12 12 5 19 12"/>
                            </svg>
                        )
                    },
                    { 
                        label: "Total Expenses", 
                        val: ov?.total, 
                        color: "var(--red)", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" x2="12" y1="5" y2="19"/>
                                <polyline points="19 12 12 19 5 12"/>
                            </svg>
                        )
                    },
                    {
                        label: "Net Balance", 
                        val: ov?.netBalance,
                        color: (ov?.netBalance ?? 0) >= 0 ? "var(--blue)" : "var(--amber)", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M12 20v-8"/><path d="m21 3-9 9"/><path d="m3 21 9-9"/>
                            </svg>
                        )
                    },
                    {
                        label: "Transactions", 
                        val: ov?.count, 
                        color: "var(--purple)", 
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 10h12"/><path d="M4 14h12"/><path d="M12 4v16"/><path d="M8 4v16"/>
                            </svg>
                        ),
                        noRupee: true
                    },
                ].map(k => (
                    <div key={k.label} className="kpi-card" style={{ borderTop: `4px solid ${k.color}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <span className="kpi-label">{k.label}</span>
                            <span className="kpi-dot" style={{ background: k.color + "15", color: k.color, marginBottom: 0 }}>
                                {k.icon}
                            </span>
                        </div>
                        <div className="kpi-val" style={{ color: k.color }}>
                            {k.noRupee ? "" : "₹"}{k.val?.toLocaleString("en-IN") ?? "0"}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Area Chart ── */}
            <div className="glass-card">
                <h3 className="card-title">Income vs Expenses — Monthly Trend</h3>

                {chartData.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--text3)", padding: "3rem" }}>
                        No data yet — add income and expenses to see the chart
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--green)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--red)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="month" tick={{ fill: "var(--text3)", fontSize: 11, fontWeight: 500 }}
                                axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text2)", paddingTop: 16 }} />
                            <Area type="monotone" dataKey="Income"
                                stroke="var(--green)" strokeWidth={2.5}
                                fill="url(#colorIncome)" dot={{ fill: "var(--green)", r: 4 }}
                                activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="Expenses"
                                stroke="var(--red)" strokeWidth={2.5}
                                fill="url(#colorExpenses)" dot={{ fill: "var(--red)", r: 4 }}
                                activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="Balance"
                                stroke="var(--blue)" strokeWidth={2}
                                fill="url(#colorBalance)" dot={{ fill: "var(--blue)", r: 3 }}
                                activeDot={{ r: 5 }} strokeDasharray="5 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Bottom Row ── */}
            <div className="overview-grid">

                {/* Category Bar Chart */}
                <div className="glass-card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title">Spending by Category</h3>

                    {cats.length === 0 ? (
                        <p style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: "3.5rem 0" }}>
                            No expense data yet
                        </p>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                <YAxis type="category" dataKey="category"
                                    tick={{ fill: "var(--text2)", fontSize: 12, fontWeight: 500 }}
                                    axisLine={false} tickLine={false} width={80} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Spent" radius={[0, 4, 4, 0]}>
                                    {cats.map((c, i) => (
                                        <Cell key={i} fill={CAT_COLORS[c.category] || "#6b7280"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Category List with % */}
                <div className="glass-card" style={{ marginBottom: 0 }}>
                    <h3 className="card-title">Category Breakdown</h3>

                    <div className="cat-status-list">
                        {cats.slice(0, 5).map(c => (
                            <div key={c.category} className="cat-ring-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 500 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div className="cat-ring-dot" style={{ background: CAT_COLORS[c.category] || "#888", boxShadow: `0 0 6px ${CAT_COLORS[c.category] || "#888"}` }} />
                                        <span className="cat-ring-name">{c.category}</span>
                                        <span className="cat-ring-count">({c.count})</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                        <span style={{ color: "var(--text2)", fontSize: 12 }}>
                                            {totalCat > 0 ? ((c.total / totalCat) * 100).toFixed(1) : 0}%
                                        </span>
                                        <span className="cat-ring-amt">
                                            ₹{c.total.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                                <div className="cat-ring-bar">
                                    <div className="cat-ring-fill" style={{
                                        width: totalCat > 0 ? `${(c.total / totalCat) * 100}%` : "0%",
                                        background: CAT_COLORS[c.category] || "#888"
                                    }} />
                                </div>
                            </div>
                        ))}
                        {cats.length === 0 && (
                            <p style={{ color: "var(--text3)", fontSize: 13, textAlign: "center", padding: "3.5rem 0" }}>
                                No data yet
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}