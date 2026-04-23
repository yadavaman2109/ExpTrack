import React, { useState } from "react";
import { login, register } from "../services/api";

export default function Auth({ onLogin }) {
    const [mode, setMode] = useState("login");
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const fn = mode === "login" ? login : register;
            const { data } = await fn(form);
            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong");
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-brand">
                    <div className="auth-logo">FA</div>
                    <h1 className="auth-title">FinanceAI</h1>
                    <p className="auth-subtitle">Track income, expenses, and build financial clarity.</p>
                </div>
                <div className="auth-stats">
                    <div className="auth-stat">
                        <span className="auth-stat-val">₹0</span>
                        <span className="auth-stat-lbl">Wasted on guesswork</span>
                    </div>
                    <div className="auth-stat">
                        <span className="auth-stat-val">100%</span>
                        <span className="auth-stat-lbl">Financial visibility</span>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-card">
                    <h2 className="auth-heading">
                        {mode === "login" ? "Welcome back" : "Create account"}
                    </h2>
                    <p className="auth-sub">
                        {mode === "login" ? "Sign in to your dashboard" : "Start tracking your finances"}
                    </p>

                    {error && <div className="auth-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {mode === "register" && (
                            <div className="field">
                                <label>Full name</label>
                                <input type="text" placeholder="Aman Yadav"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required />
                            </div>
                        )}
                        <div className="field">
                            <label>Email address</label>
                            <input type="email" placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required />
                        </div>
                        <div className="field">
                            <label>Password</label>
                            <input type="password" placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required />
                        </div>
                        <button className="auth-btn" type="submit" disabled={loading}>
                            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                        </button>
                    </form>

                    <p className="auth-toggle">
                        {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
                            {mode === "login" ? " Register" : " Sign in"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}