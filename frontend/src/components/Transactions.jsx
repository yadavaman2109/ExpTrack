import React, { useState, useEffect } from "react";
import { getAllExpenses, addExpense, updateExpense, deleteExpense } from "../services/api";

const CATS = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"];
const CAT_COLORS = {
    Food: "#f59e0b", Travel: "#3b82f6", Shopping: "#ec4899",
    Health: "#10b981", Entertainment: "#8b5cf6", Bills: "#ef4444",
    Education: "#06b6d4", Other: "#6b7280"
};

export default function Transactions({ month }) {
    const [expenses, setExpenses] = useState([]);
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
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

    return (
        <div>
            <div className="section-header">
                <div>
                    <div className="section-total">₹{total.toLocaleString("en-IN")}</div>
                    <div className="section-sub">{expenses.length} transactions this month</div>
                </div>
                <button className="btn-add" onClick={() => { setShowForm(!showForm); setEditId(null); }}>
                    + Add Expense
                </button>
            </div>

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

            <div className="tx-list">
                {expenses.map(e => (
                    <div key={e._id} className="tx-row">
                        <div className="tx-cat-dot"
                            style={{ background: CAT_COLORS[e.category] || "#888" }} />
                        <div className="tx-info">
                            <span className="tx-cat">{e.category}</span>
                            <span className="tx-note">{e.note || "—"}</span>
                        </div>
                        <span className="tx-date">
                            {new Date(e.date).toLocaleDateString("en-IN")}
                        </span>
                        <span className="tx-amount">- ₹{e.amount.toLocaleString()}</span>
                        <div className="tx-actions">
                            <button className="tx-btn" onClick={() => {
                                setEditId(e._id);
                                setShowForm(true);
                                setForm({
                                    amount: e.amount, category: e.category,
                                    date: new Date(e.date).toISOString().slice(0, 10),
                                    note: e.note || ""
                                });
                            }}>Edit</button>
                            <button className="tx-btn danger"
                                onClick={async () => { await deleteExpense(e._id); fetch(); }}>
                                Del
                            </button>
                        </div>
                    </div>
                ))}
                {expenses.length === 0 && (
                    <div className="empty-state">No expenses yet. Add your first one above.</div>
                )}
            </div>
        </div>
    );
}