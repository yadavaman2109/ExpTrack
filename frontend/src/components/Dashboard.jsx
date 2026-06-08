import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Overview from "./Overview";
import Transactions from "./Transactions";
import IncomeManager from "./IncomeManager";
import Analytics from "./Analytics";
import BudgetManager from "./BudgetManager";
import StatementImport from "./StatementImport";
import AICoach from "./AICoach";

export default function Dashboard({ user, onLogout }) {
    const [active, setActive] = useState("overview");
    const [searchQuery, setSearchQuery] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "Welcome to Jeb Track", text: "Start by importing a bank statement in PDF or CSV format.", read: false, time: "Just now" },
        { id: 2, title: "Set Up Your Budgets", text: "Create category-wise budget thresholds to receive alerts.", read: false, time: "2h ago" },
        { id: 3, title: "UI Upgrade Successful", text: "Jeb Track now features a premium dark-charcoal glassmorphic theme.", read: true, time: "1d ago" }
    ]);

    const month = new Date().toISOString().slice(0, 7);
    const displayName = user?.name || user?.email?.split("@")[0] || "User";
    const displayInitial = displayName.charAt(0).toUpperCase();

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleSearchChange = (val) => {
        setSearchQuery(val);
        if (val.trim() && (active === "overview" || active === "analytics" || active === "budget" || active === "import" || active === "coach")) {
            setActive("transactions");
        }
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const pages = {
        overview: <Overview />,
        transactions: <Transactions month={month} searchQuery={searchQuery} />,
        income: <IncomeManager month={month} searchQuery={searchQuery} />,
        analytics: <Analytics month={month} />,
        budget: <BudgetManager month={month} />,
        coach: <AICoach month={month} />,
        import: <StatementImport onImportComplete={() => setActive("overview")} />
    };

    return (
        <div className="dashboard">
            <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} />
            <main className="dash-main">
                <div className="dash-topbar">
                    <div>
                        <h2 className="dash-page-title">
                            {active === "import" ? "Statement Import" : active === "coach" ? "AI Finance Coach" : active.charAt(0).toUpperCase() + active.slice(1)}
                        </h2>
                    </div>

                    <div className="topbar-search">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>

                    <div className="topbar-right">
                        <div className="notification-container">
                            <button 
                                className="topbar-btn notification-btn" 
                                onClick={() => setShowNotifications(!showNotifications)}
                                data-tooltip="Notifications"
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifications && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h4>Notifications</h4>
                                        {notifications.length > 0 && (
                                            <button className="notification-clear-btn" onClick={clearAll}>
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                    <div className="notification-list">
                                        {notifications.length === 0 ? (
                                            <div className="notification-empty">No new notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    className={`notification-item ${n.read ? "" : "unread"}`}
                                                    onClick={() => markAsRead(n.id)}
                                                >
                                                    <div className="notification-item-title">
                                                        <span>{n.title}</span>
                                                        <span className="notification-item-time">{n.time}</span>
                                                    </div>
                                                    <div className="notification-item-text">{n.text}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="topbar-user">
                            <div className="avatar">{displayInitial}</div>
                            <span className="user-name-text">{displayName}</span>
                        </div>
                        <button className="topbar-btn logout-icon-btn" onClick={onLogout} data-tooltip="Sign Out">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="dash-content">{pages[active]}</div>
            </main>
        </div>
    );
}