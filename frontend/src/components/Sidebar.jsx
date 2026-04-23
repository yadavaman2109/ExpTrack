import React from "react";

const NAV = [
    { id: "overview", icon: "⬡", label: "Overview" },
    { id: "transactions", icon: "↕", label: "Transactions" },
    { id: "income", icon: "↑", label: "Income" },
    { id: "analytics", icon: "◈", label: "Analytics" },
    { id: "budget", icon: "◎", label: "Budget" },
];

export default function Sidebar({ active, setActive, user, onLogout }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">FA</div>
                <span className="sidebar-brand-name">FinanceAI</span>
            </div>

            <nav className="sidebar-nav">
                {NAV.map(n => (
                    <button key={n.id}
                        className={`sidebar-link ${active === n.id ? "active" : ""}`}
                        onClick={() => setActive(n.id)}>
                        <span className="sidebar-icon">{n.icon}</span>
                        <span>{n.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{user.name?.charAt(0).toUpperCase()}</div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user.name}</span>
                        <span className="sidebar-user-email">{user.email}</span>
                    </div>
                </div>
                <button className="logout-btn" onClick={onLogout}>Sign out</button>
            </div>
        </aside>
    );
}