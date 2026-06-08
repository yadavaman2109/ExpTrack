import React, { useState, useEffect } from "react";
import { getAllExpenses, addExpense, updateExpense, deleteExpense } from "../services/api";

const CATS = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"];
const CAT_COLORS = {
    Food: "#f59e0b", Travel: "#3b82f6", Shopping: "#ec4899",
    Health: "#10b981", Entertainment: "#8b5cf6", Bills: "#f43f5e",
    Education: "#06b6d4", Other: "#64748b"
};

export default function Transactions({ month, searchQuery }) {
    const [expenses, setExpenses] = useState([]);
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("All");
    const [form, setForm] = useState({
        amount: "", category: "Food",
        date: new Date().toISOString().slice(0, 10), note: ""
    });

    const fetch = async () => {
        try {
            const { data } = await getAllExpenses(month);
            setExpenses(data.data.flatMap(d =>
                d.expenses.map(e => ({ ...e, month: d.month }))
            ));
        } catch { }
    };

    useEffect(() => { fetch(); }, [month]);

    const submit = async () => {
        if (!form.amount) return;
        try {
            if (editId) {
                await updateExpense(editId, form);
                setEditId(null);
            } else {
                await addExpense(form);
            }
            setForm({
                amount: "", category: "Food",
                date: new Date().toISOString().slice(0, 10), note: ""
            });
            setShowForm(false);
            fetch();
        } catch (e) { console.error(e); }
    };

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    const filteredExpenses = expenses.filter(e => {
        const query = (searchQuery || search || "").trim().toLowerCase();
        const matchSearch = !query ||
                            e.note?.toLowerCase().includes(query) ||
                            e.category?.toLowerCase().includes(query);
        const matchCat = filterCat === "All" || e.category === filterCat;
        return matchSearch && matchCat;
    });

    return (
        <div>
            {/* Summary Topbar */}
            <div className="section-header">
                <div>
                    <div className="section-total">₹{total.toLocaleString("en-IN")}</div>
                    <div className="section-sub">{expenses.length} transactions this month</div>
                </div>
                <button className="btn-add" onClick={() => { setShowForm(!showForm); setEditId(null); }}>
                    + Add Expense
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
                            <label>Category</label>
                            <select value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}>
                                {CATS.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Date</label>
                            <input type="date" value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="field">
                            <label>Note</label>
                            <input type="text" placeholder="Optional note" value={form.note}
                                onChange={e => setForm({ ...form, note: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button className="btn-primary" onClick={submit}>
                            {editId ? "Update Expense" : "Add Expense"}
                        </button>
                        <button className="btn-ghost"
                            onClick={() => { setShowForm(false); setEditId(null); }}>
                            Cancel
                        </button>
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
                <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                    <input 
                        type="text"
                        placeholder="Search notes or categories..."
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
                        value={filterCat}
                        onChange={e => setFilterCat(e.target.value)}
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
                        <option value="All">All Categories</option>
                        {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Transaction List */}
            <div className="tx-list">
                {filteredExpenses.map(e => (
                    <div key={e._id} className="tx-row">
                        <div className="tx-cat-dot"
                            style={{ 
                                background: CAT_COLORS[e.category] || "#888",
                                color: CAT_COLORS[e.category] || "#888"
                            }} 
                        />
                        <div className="tx-info">
                            <span className="tx-cat">{e.category}</span>
                            <span className="tx-note">{e.note || "—"}</span>
                        </div>
                        <span className="tx-date">
                            {new Date(e.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            })}
                        </span>
                        <span className="tx-amount">- ₹{e.amount.toLocaleString("en-IN")}</span>
                        <div className="tx-actions">
                            <button className="tx-btn" onClick={() => {
                                setEditId(e._id);
                                setShowForm(true);
                                setForm({
                                    amount: e.amount, category: e.category,
                                    date: new Date(e.date).toISOString().slice(0, 10),
                                    note: e.note || ""
                                });
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                                </svg>
                            </button>
                            <button className="tx-btn danger"
                                onClick={async () => { await deleteExpense(e._id); fetch(); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
                {filteredExpenses.length === 0 && (
                    <div className="empty-state">
                        {expenses.length === 0 
                            ? "No expenses yet. Add your first one above." 
                            : "No expenses match your search criteria."}
                    </div>
                )}
            </div>
        </div>
    );
}