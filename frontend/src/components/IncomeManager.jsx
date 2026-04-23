import React, { useState, useEffect } from "react";
import { getAllIncome, addIncome, deleteIncome } from "../services/api";

const SOURCES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];
const SRC_COLORS = {
    Salary: "#10b981", Freelance: "#3b82f6", Business: "#f59e0b",
    Investment: "#8b5cf6", Gift: "#ec4899", Other: "#6b7280"
};

export default function IncomeManager({ month }) {
    const [items, setItems] = useState([]);
    const [showForm, setShow] = useState(false);
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

    return (
        <div>
            <div className="section-header">
                <div>
                    <div className="section-total income-total">
                        ₹{total.toLocaleString("en-IN")}
                    </div>
                    <div className="section-sub">{items.length} income entries this month</div>
                </div>
                <button className="btn-add income-btn" onClick={() => setShow(!showForm)}>
                    + Add Income
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

            <div className="tx-list">
                {items.map(i => (
                    <div key={i._id} className="tx-row">
                        <div className="tx-cat-dot"
                            style={{ background: SRC_COLORS[i.source] || "#888" }} />
                        <div className="tx-info">
                            <span className="tx-cat">{i.source}</span>
                            <span className="tx-note">{i.note || "—"}</span>
                        </div>
                        <span className="tx-date">
                            {new Date(i.date).toLocaleDateString("en-IN")}
                        </span>
                        <span className="tx-amount income-amount">
                            + ₹{i.amount.toLocaleString()}
                        </span>
                        <div className="tx-actions">
                            <button className="tx-btn danger"
                                onClick={async () => { await deleteIncome(i._id); fetch(); }}>
                                Del
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="empty-state">No income entries yet. Add your first one above.</div>
                )}
            </div>
        </div>
    );
}