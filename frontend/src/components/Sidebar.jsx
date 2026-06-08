import React from "react";

const NAV = [
    { 
        id: "overview", 
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1.5"/>
                <rect width="7" height="5" x="14" y="3" rx="1.5"/>
                <rect width="7" height="9" x="14" y="12" rx="1.5"/>
                <rect width="7" height="5" x="3" y="16" rx="1.5"/>
            </svg>
        ), 
        label: "Overview" 
    },
    { 
        id: "transactions", 
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        ), 
        label: "Expenses" 
    },
    { 
        id: "income", 
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5"/>
                <polyline points="5 12 12 5 19 12"/>
            </svg>
        ), 
        label: "Income" 
    },
    { 
        id: "analytics", 
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="18" y1="20" y2="10"/>
                <line x1="12" x2="12" y1="20" y2="4"/>
                <line x1="6" x2="6" y1="20" y2="14"/>
            </svg>
        ), 
        label: "Analytics" 
    },
    { 
        id: "budget", 
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8"/>
                <path d="M8 12h8"/>
            </svg>
        ), 
        label: "Budget" 
    },
    {
        id: "coach",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"/>
                <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/>
            </svg>
        ),
        label: "AI Coach"
    },
    {
        id: "import",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
        ),
        label: "Import Statement"
    }
];

export default function Sidebar({ active, setActive, user, onLogout }) {
    const displayName = user?.name || user?.email?.split("@")[0] || "User";
    const displayInitial = displayName.charAt(0).toUpperCase();

    return (
        <aside className="sidebar">
            <div className="sidebar-brand" data-tooltip="Jeb Track">
                <div className="sidebar-brand-icon" style={{ overflow: "hidden" }}>
                    <img src="/logo.png" alt="Jeb Track" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
            </div>

            <nav className="sidebar-nav">
                {NAV.map(n => (
                    <button key={n.id}
                        className={`sidebar-link ${active === n.id ? "active" : ""}`}
                        onClick={() => setActive(n.id)}
                        data-tooltip={n.label}>
                        <span className="sidebar-icon">{n.icon}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-avatar-wrap" data-tooltip={`${displayName} (${user?.email || ""})`}>
                    <div className="sidebar-avatar">{displayInitial}</div>
                </div>
                <button className="sidebar-logout-btn" onClick={onLogout} data-tooltip="Sign Out">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </aside>
    );
}