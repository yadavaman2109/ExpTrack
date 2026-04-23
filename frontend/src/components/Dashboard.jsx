import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Overview from "./Overview";
import Transactions from "./Transactions";
import IncomeManager from "./IncomeManager";
import Analytics from "./Analytics";
import BudgetManager from "./BudgetManager";

export default function Dashboard({ user, onLogout }) {
    const [active, setActive] = useState("overview");
    const month = new Date().toISOString().slice(0, 7);

    const pages = {
        overview: <Overview />,
        transactions: <Transactions month={month} />,
        income: <IncomeManager month={month} />,
        analytics: <Analytics month={month} />,
        budget: <BudgetManager month={month} />,
    };

    return (
        <div className="dashboard">
            <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} />
            <main className="dash-main">
                <div className="dash-topbar">
                    <div>
                        <h2 className="dash-page-title">
                            {active.charAt(0).toUpperCase() + active.slice(1)}
                        </h2>
                        <p className="dash-page-sub">
                            {new Date().toLocaleDateString("en-IN", {
                                weekday: "long", year: "numeric",
                                month: "long", day: "numeric"
                            })}
                        </p>
                    </div>
                    <div className="topbar-user">
                        <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
                        <span>{user.name}</span>
                    </div>
                </div>
                <div className="dash-content">{pages[active]}</div>
            </main>
        </div>
    );
}