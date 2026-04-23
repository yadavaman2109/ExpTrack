import React, { useState, useEffect } from "react";
import { addExpense, getAllExpenses, updateExpense, deleteExpense } from "../services/api";

const CATEGORIES = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Other"];

export default function ExpenseManager({ userId, month }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        amount: "", category: "Food",
        date: new Date().toISOString().slice(0, 10), note: ""
    });

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data } = await getAllExpenses(userId, month);
            const all = data.data.flatMap(doc =>
                doc.expenses.map(e => ({ ...e, month: doc.month }))
            );
            setExpenses(all);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchExpenses(); }, [month]);

    const handleSubmit = async () => {
        if (!form.amount || !form.category) return;
        try {
            if (editId) {
                await updateExpense(editId, { userId, ...form });
                setEditId(null);
            } else {
                await addExpense({ userId, ...form });
            }
            setForm({ amount: "", category: "Food", date: new Date().toISOString().slice(0, 10), note: "" });
            fetchExpenses();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (exp) => {
        setEditId(exp._id);
        setForm({
            amount: exp.amount,
            category: exp.category,
            date: new Date(exp.date).toISOString().slice(0, 10),
            note: exp.note || ""
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this expense?")) return;
        await deleteExpense(id, userId);
        fetchExpenses();
    };

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    return (
        <div className="card">
            <h2>Expense Manager</h2>
            <p className="muted">Add, edit and delete expenses — uses $push, $pull, $set array operators</p>
            <div className="form-row">
                <input type="number" placeholder="Amount (₹)"
                    value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="date" value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })} />
                <input type="text" placeholder="Note"
                    value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                <button className="btn-primary" onClick={handleSubmit}>
                    {editId ? "Update" : "Add"}
                </button>
                {editId && (
                    <button className="btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                )}
            </div>

            <div className="summary-row">
                <span>Total ({expenses.length} expenses)</span>
                <strong>₹{total.toFixed(2)}</strong>
            </div>

            {loading ? <p className="muted">Loading...</p> : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(e => (
                            <tr key={e._id}>
                                <td>{new Date(e.date).toLocaleDateString()}</td>
                                <td><span className={`badge cat-${e.category.toLowerCase()}`}>{e.category}</span></td>
                                <td>₹{e.amount.toFixed(2)}</td>
                                <td className="muted">{e.note}</td>
                                <td>
                                    <button className="btn-sm" onClick={() => handleEdit(e)}>Edit</button>
                                    <button className="btn-sm danger" onClick={() => handleDelete(e._id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                        {expenses.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: "center", color: "#999", padding: "2rem" }}>
                                No expenses yet. Add your first expense above.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}