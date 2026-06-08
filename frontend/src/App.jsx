import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (saved && token) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) return (
    <div className="splash">
      <img src="/logo.png" alt="Jeb Track Logo" style={{ width: "56px", height: "56px", borderRadius: "14px", objectFit: "cover", animation: "pulse 1.2s ease-in-out infinite" }} />
    </div>
  );

  return user
    ? <Dashboard user={user} onLogout={handleLogout} />
    : <Auth onLogin={handleLogin} />;
}