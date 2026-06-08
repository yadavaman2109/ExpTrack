import React, { useState, useEffect } from "react";
import { getAllIncome, addIncome, deleteIncome } from "../services/api";

const SOURCES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];
const SRC_COLORS = {
    Salary: "#10b981", Freelance: "#3b82f6", Business: "#f59e0b",
    Investment: "#8b5cf6", Gift: "#ec4899", Other: "#64748b"
};

export default function IncomeManager({ month, searchQuery }) {
    const [items, setItems] = useState([]);
    const [showForm, setShow] = useState(false);
    const [search, setSearch] = useState("");
    const [filterSource, setFilterSource] = useState("All");
    const [form, setForm] = useState({
        amount: "", source: "Salary",
        date: new Date().toISOString().slice(0, 10), note: ""
    });

    const fetch = async () => {
        try {
            const { data } = await getAllIncome(month);
            setItems(data.data.flatMap(d =>
                d.income.map(i => ({ ...i, month: d.month }))
            ));
        } catch { }
    };

    useEffect(() => { fetch(); }, [month]);

    const submit = async () => {
        if (!form.amount) return;
        try {
            await addIncome(form);
            setForm({
                amount: "", source: "Salary",
                date: new Date().toISOString().slice(0, 10), note: ""
            });
            setShow(false);
            fetch();
        } catch (e) { console.error(e); }
    };

    const total = items.reduce((s, i) => s + i.amount, 0);

    const filteredItems = items.filter(i => {
        const query = (searchQuery || search || "").trim().toLowerCase();
        const matchSearch = !query ||
                            i.note?.toLowerCase().includes(query) ||
                            i.source?.toLowerCase().includes(query);
        const matchSource = filterSource === "All" || i.source === filterSource;
        return matchSearch && matchSource;
    });

    return (
        <div>
            {/* Summary Topbar */}
            <div className="section-header">
                <div>
                    <div className="section-total income-total">₹{total.toLocaleString("en-IN")}</div>
                    <div className="section-sub">{items.length} income entries this month</div>
                </div>
                <button className="btn-add income-btn" onClick={() => setShow(!showForm)}>
                    + Add Income
                </button>
            </div>

            {/* Entry Form */}
            {showForm && (
                <div className="form-card">
                    <div className="form-grid">
                        <div className="field">
                            <label>Amount (₹)</label>
                            <input type="number" placeholder="0.00" value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Source</label>
                            <select value={form.source}
                                onChange={e => setForm({ ...form, source: e.target.value })}>
                                {SOURCES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Date</label>
                            <input type="date" value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Note</label>
                            <input type="text" placeholder="e.g. Monthly salary" value={form.note}
                                onChange={e => setForm({ ...form, note: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn-primary income-primary" onClick={submit}>
                            Add Income
                        </button>
                        <button className="btn-ghost" onClick={() => setShow(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div style={{
                display: "flex",
                gap: "12px",
                marginBottom: "1.25rem",
                flexWrap: "wrap"
            }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                    <input 
                        type="text"
                        placeholder="Search notes or sources..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 14px",
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text)",
                            fontSize: "13.5px",
                            outline: "none",
                            transition: "border 0.15s"
                        }}
                    />
                </div>
                <div style={{ width: "160px" }}>
                    <select
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "10px 14px",
                            background: "var(--bg2)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text)",
                            fontSize: "13.5px",
                            outline: "none",
                            cursor: "pointer"
                        }}
                    >
                        <option value="All">All Sources</option>
                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Income List */}
            <div className="tx-list">
                {filteredItems.map(i => (
                    <div key={i._id} className="tx-row">
                        <div className="tx-cat-dot"
                            style={{ 
                                background: SRC_COLORS[i.source] || "#888",
                                color: SRC_COLORS[i.source] || "#888"
                            }} 
                        />
                        <div className="tx-info">
                            <span className="tx-cat">{i.source}</span>
                            <span className="tx-note">{i.note || "—"}</span>
                        </div>
                        <span className="tx-date">
                            {new Date(i.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            })}
                        </span>
                        <span className="tx-amount income-amount">+ ₹{i.amount.toLocaleString("en-IN")}</span>
                        <div className="tx-actions">
                            <button className="tx-btn danger"
                                onClick={async () => { await deleteIncome(i._id); fetch(); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
                {filteredItems.length === 0 && (
                    <div className="empty-state">
                        {items.length === 0 
                            ? "No income entries yet. Add your first one above." 
                            : "No income entries match your search criteria."}
                    </div>
                )}
            </div>
        </div>
    );
}