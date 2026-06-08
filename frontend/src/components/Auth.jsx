import React, { useState, useEffect } from "react";
import { login, sendOtp, verifyOtp, completeProfile } from "../services/api";

export default function Auth({ onLogin }) {
    const [mode, setMode] = useState("login"); // "login" | "register"
    const [otpStage, setOtpStage] = useState("send"); // "send" | "verify" | "complete" for registration

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [timer, setTimer] = useState(0);

    const [profileForm, setProfileForm] = useState({ name: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [authToken, setAuthToken] = useState(""); // hold token between verify and complete stages

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "login") {
                const { data } = await login({ email, password });
                onLogin(data.user, data.token);
            } else {
                // Register flow
                if (otpStage === "send") {
                    await sendOtp(email);
                    setOtpStage("verify");
                    setTimer(60);
                } else if (otpStage === "verify") {
                    const { data } = await verifyOtp(email, otpCode);
                    localStorage.setItem("token", data.token);
                    setAuthToken(data.token);
                    
                    if (!data.user.isProfileComplete) {
                        setOtpStage("complete");
                    } else {
                        onLogin(data.user, data.token);
                    }
                } else if (otpStage === "complete") {
                    const { data } = await completeProfile(profileForm);
                    onLogin(data.user, authToken);
                }
            }
        } catch (err) {
            const errData = err.response?.data?.error;
            setError(typeof errData === "object" ? (errData.message || JSON.stringify(errData)) : (errData || "Something went wrong"));
        } finally { setLoading(false); }
    };

    const handleResendOtp = async () => {
        setError("");
        setLoading(true);
        try {
            await sendOtp(email);
            setTimer(60);
            setOtpCode("");
        } catch (err) {
            const errData = err.response?.data?.error;
            setError(typeof errData === "object" ? (errData.message || JSON.stringify(errData)) : (errData || "Failed to resend code"));
        } finally { setLoading(false); }
    };

    const handleToggleMode = () => {
        setError("");
        if (mode === "login") {
            setMode("register");
            setOtpStage("send");
        } else {
            setMode("login");
        }
    };

    return (
        <div className="auth-container">
            {/* Background glowing blur blobs */}
            <div className="auth-blob auth-blob-1"></div>
            <div className="auth-blob auth-blob-2"></div>
            <div className="auth-blob auth-blob-3"></div>

            {/* Large Glass Backdrop */}
            <div className="auth-outer-glass">
                {/* 3D abstract curves simulation */}
                <div className="auth-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>

                {/* Main Card */}
                <div className="auth-card-glass">
                    <div className="auth-header" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "2rem" }}>
                        <img src="/logo.png" alt="Jeb Track Logo" className="auth-logo-img" style={{ margin: 0 }} />
                        <span className="auth-brand-name-text">Jeb Track</span>
                    </div>

                    <h2 className="auth-heading">
                        {mode === "login" ? "Sign In" : (otpStage === "complete" ? "Set Up Account" : "Register")}
                    </h2>

                    {error && <div className="auth-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form-glass">
                        {mode === "login" && (
                            <>
                                <div className="glass-field">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="username@gmail.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="glass-field">
                                    <label>Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required 
                                    />
                                </div>
                            </>
                        )}

                        {mode === "register" && otpStage !== "complete" && (
                            <div className="glass-field">
                                <label>Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="username@gmail.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={otpStage === "verify"}
                                    required 
                                />
                            </div>
                        )}

                        {mode === "register" && otpStage === "verify" && (
                            <div className="glass-field">
                                <label>Verification Code</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter 6-digit code"
                                    maxLength="6"
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                    required 
                                />
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "11px" }}>
                                    <span style={{ color: "var(--text3)" }}>
                                        {timer > 0 ? `Resend code in ${timer}s` : (
                                            <button 
                                                type="button" 
                                                onClick={handleResendOtp}
                                                style={{ background: "none", border: "none", color: "var(--pink)", cursor: "pointer", padding: 0 }}
                                            >
                                                Resend code
                                            </button>
                                        )}
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => { setOtpStage("send"); setOtpCode(""); }}
                                        style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", padding: 0 }}
                                    >
                                        Change email
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === "register" && otpStage === "complete" && (
                            <>
                                <p style={{ fontSize: "12.5px", color: "var(--text2)", marginBottom: "1.5rem", textAlign: "center", lineHeight: "1.5" }}>
                                    Please complete your details to set up your account.
                                </p>
                                <div className="glass-field">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="John Doe"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                        required 
                                    />
                                </div>
                                <div className="glass-field">
                                    <label>Choose Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Minimum 6 characters"
                                        value={profileForm.password}
                                        onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                                        required 
                                    />
                                </div>
                            </>
                        )}

                        <button className="auth-btn-glass" type="submit" disabled={loading}>
                            {loading ? "Please wait..." : (
                                mode === "login" ? "Sign In" : (
                                    otpStage === "send" ? "Send Verification Code" : (
                                        otpStage === "verify" ? "Verify & Continue" : "Complete Setup"
                                    )
                                )
                            )}
                        </button>
                    </form>

                    <div className="social-divider">
                        <span>or continue with</span>
                    </div>

                    <div className="social-buttons">
                        <button className="social-btn" type="button" onClick={() => alert("Google sign in is under development")}>
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path fill="#EA4335" d="M12.24 10.285V13.4h6.887c-.275 1.56-1.545 4.585-6.887 4.585-4.62 0-8.39-3.825-8.39-8.542s3.77-8.543 8.39-8.543c2.63 0 4.385 1.13 5.39 2.1l2.45-2.355C18.395 1.343 15.61 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.58-4.89 11.58-11.79 0-.79-.085-1.4-.19-1.9H12.24z"/>
                            </svg>
                        </button>
                        <button className="social-btn" type="button" onClick={() => alert("GitHub sign in is under development")}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.646.64.699 1.026 1.592 1.026 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                            </svg>
                        </button>
                        <button className="social-btn" type="button" onClick={() => alert("Facebook sign in is under development")}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </button>
                    </div>

                    <p className="auth-toggle-glass">
                        {mode === "login" ? "Don't have an account yet?" : "Already have an account?"}
                        <button onClick={handleToggleMode}>
                            {mode === "login" ? " Register for free" : " Sign in"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}