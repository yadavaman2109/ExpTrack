import React, { useState, useRef } from "react";
import axios from "axios";

const EXP_CATS = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"];
const INC_SOURCES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

export default function StatementImport({ onImportComplete }) {
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all"); // all, expense, income, duplicate
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragging(true);
        } else if (e.type === "dragleave") {
            setDragging(false);
        }
    };

    const validateAndSetFile = (selectedFile) => {
        if (!selectedFile) return;
        
        // Max size: 10MB
        if (selectedFile.size > 10 * 1024 * 1024) {
            showToast("File size exceeds 10MB limit", "error");
            return;
        }

        const ext = selectedFile.name.split(".").pop().toLowerCase();
        if (!["csv", "xlsx", "xls", "pdf"].includes(ext)) {
            showToast("Invalid file format. Upload PDF, CSV, or Excel sheets.", "error");
            return;
        }

        setFile(selectedFile);
        uploadFile(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const uploadFile = async (targetFile) => {
        setLoading(true);
        setProgress(0);
        
        const formData = new FormData();
        formData.append("file", targetFile);

        const token = localStorage.getItem("token");

        try {
            const res = await axios.post("/import/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`
                },
                onUploadProgress: (pEvent) => {
                    const pct = Math.round((pEvent.loaded * 100) / pEvent.total);
                    setProgress(pct);
                }
            });
            
            if (res.data.success) {
                setTransactions(res.data.transactions);
                showToast(`Parsed ${res.data.count} transactions successfully!`);
            }
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.error || "Failed to process bank statement";
            showToast(errMsg, "error");
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (transactions.length === 0) return;
        
        setLoading(true);
        const token = localStorage.getItem("token");

        try {
            const res = await axios.post("/import/confirm", {
                transactions: transactions.filter(t => !t.isDuplicate)
            }, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.data.success) {
                showToast(res.data.message);
                setTransactions([]);
                setFile(null);
                if (onImportComplete) onImportComplete();
            }
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.error || "Failed to save transactions", "error");
        } finally {
            setLoading(false);
        }
    };

    // Table Inline Editing
    const updateRowCategory = (index, value) => {
        const copy = [...transactions];
        copy[index].category = value;
        
        // Re-generate duplicate hash since category/merchant could affect duplicates
        copy[index].duplicateHash = [
            copy[index].date,
            copy[index].amount,
            copy[index].merchant.toLowerCase().trim(),
            copy[index].type
        ].join("|");
        
        setTransactions(copy);
    };

    const deleteRow = (index) => {
        const copy = [...transactions];
        copy.splice(index, 1);
        setTransactions(copy);
    };

    // Searching & Filtering
    const filtered = transactions.filter((t, index) => {
        const matchesSearch = t.merchant?.toLowerCase().includes(search.toLowerCase()) || 
                              t.category?.toLowerCase().includes(search.toLowerCase());
        
        if (filterType === "expense") return matchesSearch && t.type === "expense";
        if (filterType === "income") return matchesSearch && t.type === "income";
        if (filterType === "duplicate") return matchesSearch && t.isDuplicate;
        return matchesSearch;
    });

    const activeCount = transactions.filter(t => !t.isDuplicate).length;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Toast Banner */}
            {toast && (
                <div style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    zIndex: 9999,
                    background: toast.type === "error" ? "rgba(244, 63, 94, 0.95)" : "rgba(16, 185, 129, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    color: "white",
                    fontWeight: 600,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(8px)",
                    animation: "slideDown 0.2s ease"
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Drag and Drop Zone */}
            {transactions.length === 0 && (
                <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className="glass-card"
                    style={{
                        border: dragging ? "2px dashed var(--green)" : "2px dashed var(--border2)",
                        background: dragging ? "rgba(16, 185, 129, 0.04)" : "rgba(16, 20, 35, 0.5)",
                        padding: "4rem 2rem",
                        textAlign: "center",
                        cursor: "pointer",
                        borderRadius: "var(--radius)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "16px"
                    }}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleSelect} 
                        accept=".csv,.xlsx,.xls,.pdf" 
                        style={{ display: "none" }} 
                    />
                    
                    <div style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.03)",
                        display: "flex",
                        alignItems: "center",
                        justify: "center",
                        justifyContent: "center",
                        color: "var(--text2)",
                        border: "1px solid var(--border)"
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" x2="12" y1="3" y2="15"/>
                        </svg>
                    </div>

                    <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
                            Drag & drop your bank statement here
                        </h3>
                        <p style={{ color: "var(--text3)", fontSize: "13px" }}>
                            Supports PDF, CSV, Excel formats up to 10MB
                        </p>
                    </div>

                    {loading && (
                        <div style={{ width: "100%", maxWidth: "250px", marginTop: "10px" }}>
                            <div style={{
                                height: "6px",
                                background: "var(--bg3)",
                                borderRadius: "3px",
                                overflow: "hidden",
                                marginBottom: "6px"
                            }}>
                                <div style={{
                                    height: "100%",
                                    width: `${progress}%`,
                                    background: "var(--green)",
                                    transition: "width 0.1s ease"
                                }} />
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--text2)", fontWeight: 500 }}>
                                Parsing Statement... {progress}%
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Transactions Preview Table */}
            {transactions.length > 0 && (
                <div className="glass-card" style={{ padding: "1.5rem" }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem",
                        flexWrap: "wrap",
                        gap: "12px"
                    }}>
                        <div>
                            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Confirm Statement Import</h3>
                            <p style={{ color: "var(--text3)", fontSize: "12.5px", marginTop: "2px" }}>
                                Previewing transactions parsed from {file?.name || "statement"}.
                            </p>
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button 
                                className="btn-ghost" 
                                onClick={() => { setTransactions([]); setFile(null); }}
                                disabled={loading}
                            >
                                Clear
                            </button>
                            <button 
                                className="btn-primary income-primary" 
                                onClick={handleConfirmImport}
                                disabled={loading || activeCount === 0}
                            >
                                {loading ? "Importing..." : `Import ${activeCount} Transactions`}
                            </button>
                        </div>
                    </div>

                    {/* Filter controls */}
                    <div style={{
                        display: "flex",
                        gap: "12px",
                        marginBottom: "1.25rem",
                        flexWrap: "wrap"
                    }}>
                        <input 
                            type="text"
                            placeholder="Search preview..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: "200px",
                                padding: "9px 12px",
                                background: "var(--bg)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                color: "var(--text)",
                                fontSize: "13.5px",
                                outline: "none"
                            }}
                        />

                        <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "2px" }}>
                            {[
                                { id: "all", label: `All (${transactions.length})` },
                                { id: "expense", label: `Debits (${transactions.filter(t => t.type === "expense").length})` },
                                { id: "income", label: `Credits (${transactions.filter(t => t.type === "income").length})` },
                                { id: "duplicate", label: `Duplicates (${transactions.filter(t => t.isDuplicate).length})` }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setFilterType(opt.id)}
                                    style={{
                                        padding: "6px 12px",
                                        background: filterType === opt.id ? "var(--bg3)" : "transparent",
                                        border: "none",
                                        borderRadius: "6px",
                                        color: filterType === opt.id ? "var(--text)" : "var(--text2)",
                                        fontSize: "12px",
                                        fontWeight: 650,
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border)", color: "var(--text2)", textAlign: "left" }}>
                                    <th style={{ padding: "12px 16px" }}>Date</th>
                                    <th style={{ padding: "12px 16px" }}>Merchant / Details</th>
                                    <th style={{ padding: "12px 16px" }}>Type</th>
                                    <th style={{ padding: "12px 16px" }}>Amount</th>
                                    <th style={{ padding: "12px 16px" }}>Category / Source</th>
                                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, idx) => (
                                    <tr key={idx} style={{ 
                                        borderBottom: "1px solid var(--border)", 
                                        opacity: t.isDuplicate ? 0.5 : 1,
                                        background: t.isDuplicate ? "rgba(244, 63, 94, 0.01)" : "transparent"
                                    }}>
                                        {/* Date */}
                                        <td style={{ padding: "12px 16px", color: "var(--text2)", whiteSpace: "nowrap" }}>
                                            {new Date(t.date).toLocaleDateString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </td>
                                        
                                        {/* Merchant */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ fontWeight: 600 }}>{t.merchant}</div>
                                            <div style={{ fontSize: "11px", color: "var(--text3)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {t.description}
                                            </div>
                                        </td>
                                        
                                        {/* Type */}
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{ 
                                                fontSize: "11px", 
                                                padding: "3px 8px", 
                                                borderRadius: "4px", 
                                                fontWeight: 600,
                                                background: t.type === "income" ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.12)",
                                                color: t.type === "income" ? "var(--green)" : "var(--red)"
                                            }}>
                                                {t.type === "income" ? "CREDIT" : "DEBIT"}
                                            </span>
                                        </td>
                                        
                                        {/* Amount */}
                                        <td style={{ 
                                            padding: "12px 16px", 
                                            fontFamily: "var(--mono)", 
                                            fontWeight: 600,
                                            color: t.type === "income" ? "var(--green)" : "var(--text)"
                                        }}>
                                            ₹{t.amount.toLocaleString("en-IN")}
                                        </td>
                                        
                                        {/* Category Select */}
                                        <td style={{ padding: "12px 16px" }}>
                                            {t.isDuplicate ? (
                                                <span style={{ fontSize: "11.5px", color: "var(--red)", fontWeight: 600 }}>
                                                    Duplicate Transaction
                                                </span>
                                            ) : (
                                                <select
                                                    value={t.category}
                                                    onChange={(e) => updateRowCategory(idx, e.target.value)}
                                                    style={{
                                                        padding: "6px 10px",
                                                        background: "var(--bg)",
                                                        border: "1px solid var(--border2)",
                                                        borderRadius: "6px",
                                                        color: "var(--text)",
                                                        outline: "none",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    {t.type === "expense" 
                                                        ? EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)
                                                        : INC_SOURCES.map(s => <option key={s} value={s}>{s}</option>)
                                                    }
                                                </select>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                            <button 
                                                onClick={() => deleteRow(idx)}
                                                style={{
                                                    padding: "6px 10px",
                                                    background: "transparent",
                                                    border: "1px solid rgba(244, 63, 94, 0.2)",
                                                    borderRadius: "6px",
                                                    color: "#fca5a5",
                                                    cursor: "pointer",
                                                    fontSize: "11.5px"
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text3)" }}>
                                            No preview items match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
