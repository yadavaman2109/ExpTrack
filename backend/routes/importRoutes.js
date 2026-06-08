const router = require("express").Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const xlsx = require("xlsx");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const ExpenseDoc = require("../models/ExpenseDocument");
const IncomeDoc = require("../models/IncomeDocument");
const Transaction = require("../models/Transaction");

// Multer Setup
const upload = multer({
    dest: os.tmpdir(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const ALLOWED_EXPENSES = ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"];
const ALLOWED_INCOMES = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

// Helper to clean descriptions and extract merchants
function cleanMerchantName(desc) {
    if (!desc) return "Unknown Merchant";
    let clean = desc
        .replace(/UPI[-/]/gi, "")
        .replace(/TRANSFER[-/]/gi, "")
        .replace(/IMPS[-/]/gi, "")
        .replace(/NEFT[-/]/gi, "")
        .replace(/DEBIT[-/]/gi, "")
        .replace(/CREDIT[-/]/gi, "")
        .replace(/PAYMENT[-/]/gi, "")
        .replace(/SENT TO/gi, "")
        .replace(/RECEIVED FROM/gi, "")
        .replace(/\b[A-Za-z0-9]{12,}\b/g, "") // remove long ref keys
        .replace(/\d{10,}/g, "") // remove long numbers
        .replace(/@[a-zA-Z]+/g, "") // remove handles
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    clean = clean.split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    return clean.split(" ").slice(0, 3).join(" ") || desc;
}

// Robust helper to parse currency string into clean number
function parseAmount(val) {
    if (val === undefined || val === null || val === "") return 0;
    // Remove all characters except digits, minus sign, and dot
    const clean = String(val).replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}

// Auto-Categorization Rule Engine
async function autoCategorize(description, amount, type) {
    const desc = description.toLowerCase();
    
    if (type === "expense") {
        if (desc.includes("swiggy") || desc.includes("zomato") || desc.includes("blinkit") || desc.includes("zepto") || desc.includes("food") || desc.includes("restaurant") || desc.includes("cafe") || desc.includes("pizza") || desc.includes("mcdonald") || desc.includes("burger")) {
            return { category: "Food", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("uber") || desc.includes("ola") || desc.includes("rapido") || desc.includes("irctc") || desc.includes("metro") || desc.includes("cab") || desc.includes("travel") || desc.includes("flight") || desc.includes("railway") || desc.includes("train") || desc.includes("bus")) {
            return { category: "Travel", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("amazon") || desc.includes("flipkart") || desc.includes("myntra") || desc.includes("meesho") || desc.includes("reliance") || desc.includes("shopping") || desc.includes("store") || desc.includes("mart") || desc.includes("retail") || desc.includes("groceries")) {
            return { category: "Shopping", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("electricity") || desc.includes("broadband") || desc.includes("mobile") || desc.includes("recharge") || desc.includes("jio") || desc.includes("airtel") || desc.includes("vi") || desc.includes("bill") || desc.includes("dth") || desc.includes("water") || desc.includes("gas") || desc.includes("rent")) {
            return { category: "Bills", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("netflix") || desc.includes("spotify") || desc.includes("prime") || desc.includes("hotstar") || desc.includes("youtube") || desc.includes("pvr") || desc.includes("cinema") || desc.includes("bookmyshow") || desc.includes("entertainment") || desc.includes("movies")) {
            return { category: "Entertainment", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("medical") || desc.includes("pharmacy") || desc.includes("hospital") || desc.includes("doctor") || desc.includes("apollo") || desc.includes("health") || desc.includes("medicine") || desc.includes("clinic")) {
            return { category: "Health", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("school") || desc.includes("college") || desc.includes("fees") || desc.includes("udemy") || desc.includes("coursera") || desc.includes("education") || desc.includes("tuition") || desc.includes("books")) {
            return { category: "Education", merchant: cleanMerchantName(description) };
        }
    } else {
        if (desc.includes("salary") || desc.includes("payroll") || desc.includes("payslip") || desc.includes("wages") || desc.includes("ctc")) {
            return { category: "Salary", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("freelance") || desc.includes("upwork") || desc.includes("fiverr") || desc.includes("contract")) {
            return { category: "Freelance", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("dividend") || desc.includes("interest") || desc.includes("mutual fund") || desc.includes("zerodha") || desc.includes("groww") || desc.includes("investment") || desc.includes("stocks") || desc.includes("securities")) {
            return { category: "Investment", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("cash") || desc.includes("gift") || desc.includes("reward") || desc.includes("cashback") || desc.includes("refund")) {
            return { category: "Gift", merchant: cleanMerchantName(description) };
        }
        if (desc.includes("business") || desc.includes("sales") || desc.includes("merchant") || desc.includes("store")) {
            return { category: "Business", merchant: cleanMerchantName(description) };
        }
    }

    // AI Categorization Fallback
    if (process.env.GEMINI_API_KEY) {
        try {
            const aiResult = await callGeminiCategorization(description, amount, type);
            if (aiResult) return aiResult;
        } catch (err) {
            console.error("Gemini AI categorization failed: ", err.message);
        }
    }

    return { category: "Other", merchant: cleanMerchantName(description) };
}

async function callGeminiCategorization(description, amount, type) {
    const categories = type === "expense" ? ALLOWED_EXPENSES : ALLOWED_INCOMES;
    const prompt = `You are a financial transactions assistant.
Categorize the following bank transaction description into exactly one of these categories: ${JSON.stringify(categories)}.
Transaction Description: "${description}"
Amount: ₹${amount}
Type: ${type}

Respond ONLY with a valid JSON object matching this schema:
{
  "category": "category name here",
  "merchant": "clean merchant/source name here"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const text = response.data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text.trim());
    
    if (categories.includes(parsed.category)) {
        return {
            category: parsed.category,
            merchant: parsed.merchant || cleanMerchantName(description)
        };
    }
    return null;
}

// Scans up to 30 rows of Excel/CSV to locate the table headers row
function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const headers = row.map(h => String(h || "").toLowerCase().trim());
        
        let hasDate = headers.some(h => h.includes("date") || h.includes("txn date") || h.includes("value date"));
        let hasDesc = headers.some(h => h.includes("desc") || h.includes("narration") || h.includes("particular") || h.includes("remark") || h.includes("transaction"));
        let hasAmount = headers.some(h => h.includes("debit") || h.includes("withdrawal") || h.includes("credit") || h.includes("deposit") || h.includes("amount") || h.includes("dr") || h.includes("cr"));
        
        if (hasDate && hasDesc && hasAmount) {
            return i;
        }
    }
    return 0; // fallback to index 0
}

function autoDetectFields(headers) {
    let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, balanceIdx = -1;
    
    headers.forEach((h, idx) => {
        const val = h.toLowerCase().trim();
        if (val.includes("date") || val.includes("txndate") || val.includes("value date")) {
            if (dateIdx === -1) dateIdx = idx;
        } else if (val.includes("desc") || val.includes("narration") || val.includes("particulars") || val.includes("remarks") || val.includes("transaction")) {
            if (descIdx === -1) descIdx = idx;
        } else if (val.includes("debit") || val.includes("withdrawal") || val.includes("spent") || val.includes("dr") || val.includes("withdrawal amount") || val.includes("payment")) {
            if (debitIdx === -1) debitIdx = idx;
        } else if (val.includes("credit") || val.includes("deposit") || val.includes("received") || val.includes("cr") || val.includes("deposit amount") || val.includes("receipt")) {
            if (creditIdx === -1) creditIdx = idx;
        } else if (val.includes("balance") || val.includes("bal")) {
            if (balanceIdx === -1) balanceIdx = idx;
        }
    });

    // If separate debit/credit column not found, check for generic "amount" column
    if (debitIdx === -1 && creditIdx === -1) {
        headers.forEach((h, idx) => {
            const val = h.toLowerCase().trim();
            if (val.includes("amount")) {
                debitIdx = idx;
                creditIdx = idx;
            }
        });
    }

    return { dateIdx, descIdx, debitIdx, creditIdx, balanceIdx };
}

// 1. Upload & Parse Statement Route
router.post("/upload", auth, upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const filename = req.file.originalname.toLowerCase();
    let rawTransactions = [];

    try {
        if (filename.endsWith(".csv") || filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            
            if (rows.length <= 1) {
                throw new Error("Empty statement sheet. No rows found.");
            }

            const headerRowIdx = findHeaderRow(rows);
            const headers = rows[headerRowIdx].map(h => String(h || ""));
            console.log("Detected sheet headers at index", headerRowIdx, ":", headers);
            
            const { dateIdx, descIdx, debitIdx, creditIdx, balanceIdx } = autoDetectFields(headers);
            console.log("Detected field indices:", { dateIdx, descIdx, debitIdx, creditIdx, balanceIdx });

            if (dateIdx === -1 || descIdx === -1) {
                throw new Error("Unable to identify 'Date' or 'Description' columns in sheet.");
            }

            for (let i = headerRowIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0 || !row[dateIdx]) continue;
                
                const dateVal = row[dateIdx];
                const descVal = row[descIdx];
                
                let debitVal = 0, creditVal = 0, balanceVal = 0;
                
                // If debit and credit are the same column, determine by sign
                if (debitIdx === creditIdx && debitIdx !== -1) {
                    const val = parseAmount(row[debitIdx]);
                    if (val < 0) {
                        debitVal = Math.abs(val);
                    } else {
                        creditVal = val;
                    }
                } else {
                    if (debitIdx !== -1) {
                        debitVal = parseAmount(row[debitIdx]);
                    }
                    if (creditIdx !== -1) {
                        creditVal = parseAmount(row[creditIdx]);
                    }
                }

                if (balanceIdx !== -1) {
                    balanceVal = parseAmount(row[balanceIdx]);
                }

                if (dateVal && descVal && (debitVal > 0 || creditVal > 0)) {
                    rawTransactions.push({
                        rawDate: String(dateVal),
                        description: String(descVal),
                        debit: debitVal,
                        credit: creditVal,
                        balance: balanceVal
                    });
                }
            }
        } else if (filename.endsWith(".pdf")) {
            // PDF parser
            const { PDFParse } = require("pdf-parse");
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse(new Uint8Array(dataBuffer));
            const pdfData = await parser.getText();
            const lines = pdfData.text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            console.log("PDF parsed successfully. Total lines:", lines.length);
            console.log("First 15 lines preview:", lines.slice(0, 15));
            
            const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[a-zA-Z]{3,9},?\s+\d{2,4}|[a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{2,4})\b/i;
            const amountRegex = /\b(\d+(?:,\d{3})*(?:\.\d{2})?)\b/g;

            let currentDate = null;

            lines.forEach((line, idx) => {
                const dateMatch = line.match(dateRegex);
                
                if (dateMatch && line.length < 25) {
                    // Multi-line block format: set currentDate
                    currentDate = dateMatch[0];
                    console.log(`[Parser] Found Date marker: "${currentDate}"`);
                } else if (dateMatch && line.length >= 25) {
                    // Single-line format (contains both date and other info)
                    const dateStr = dateMatch[0];
                    let remainingText = line.replace(dateStr, "");
                    const amounts = remainingText.match(amountRegex);
                    
                    const filtered = amounts ? amounts.filter(a => {
                        const cleanStr = a.replace(/,/g, "");
                        return !(!cleanStr.includes(".") && cleanStr.length >= 9);
                    }) : [];

                    if (filtered.length > 0) {
                        const parsedAmounts = filtered.map(a => parseFloat(a.replace(/,/g, "")));
                        let debit = 0, credit = 0;
                        const mainAmount = parsedAmounts[0];

                        const isCredit = /credit|cr|received|refund|deposit|dep/i.test(line);
                        if (isCredit) {
                            credit = mainAmount;
                        } else {
                            debit = mainAmount;
                        }

                        filtered.forEach(a => { remainingText = remainingText.replace(a, ""); });
                        const desc = remainingText.replace(/Cr|Dr/gi, "").replace(/\s+/g, " ").trim();

                        if (mainAmount > 0) {
                            console.log(`[Parser] Parsed single-line tx:`, { dateStr, desc, mainAmount, type: isCredit ? "credit" : "debit" });
                            rawTransactions.push({
                                rawDate: dateStr,
                                description: desc || "Transaction",
                                debit,
                                credit,
                                balance: parsedAmounts[1] || 0
                            });
                        }
                    }
                } else if (currentDate) {
                    // We have an active date context and are scanning subsequent lines
                    const isDebit = /\bDEBIT\b/i.test(line);
                    const isCredit = /\bCREDIT\b/i.test(line);
                    
                    if (isDebit || isCredit) {
                        const cleanLine = line.replace(/Transaction ID|UTR No\./gi, "");
                        const amounts = cleanLine.match(/\b(\d+(?:,\d{3})*(?:\.\d{2})?)\b/g);
                        
                        // Also look for currency characters and numbers directly attached (like ₹20)
                        const rawAmounts = cleanLine.match(/[\d,.]+/g);
                        const allAmounts = [...(amounts || []), ...(rawAmounts || [])];
                        
                        // Filter to find valid amount strings
                        const filtered = allAmounts.filter(a => {
                            const cleanStr = a.replace(/[^0-9.]/g, "");
                            return cleanStr.length > 0 && cleanStr.length < 9;
                        });

                        if (filtered.length > 0) {
                            const amount = parseFloat(filtered[0].replace(/[^0-9.]/g, ""));
                            
                            let description = line;
                            const tabParts = line.split("\t");
                            if (tabParts.length > 1) {
                                description = tabParts[1];
                            } else {
                                description = line.replace(/DEBIT|CREDIT/gi, "")
                                                  .replace(/₹|Rs\.?/g, "")
                                                  .replace(filtered[0], "")
                                                  .replace(/\s+/g, " ")
                                                  .trim();
                            }

                            // Strip "Paid to" or "Received from" if present
                            description = description.replace(/^Paid to /i, "").replace(/^Received from /i, "");

                            if (amount > 0) {
                                console.log(`[Parser] Parsed multi-line tx:`, { currentDate, description, amount, type: isDebit ? "debit" : "credit" });
                                rawTransactions.push({
                                    rawDate: currentDate,
                                    description: description || "Transaction",
                                    debit: isDebit ? amount : 0,
                                    credit: isCredit ? amount : 0,
                                    balance: 0
                                });
                            }
                        }
                    }
                }
            });
        } else {
            return res.status(400).json({ error: "Unsupported file format. Please upload PDF, CSV, or XLSX files." });
        }

        // Clean file after parsing
        fs.unlinkSync(filePath);

        if (rawTransactions.length === 0) {
            return res.status(422).json({ error: "No transactions could be parsed from the file. Please check file columns and dates." });
        }

        // Normalize data
        const normalized = [];
        for (const tx of rawTransactions) {
            let date = new Date(tx.rawDate);
            if (isNaN(date.getTime())) {
                const parts = tx.rawDate.split(/[-/.\s,]+/);
                if (parts.length >= 3) {
                    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                    let day = parseInt(parts[1]); // Month-first dates, e.g. Jun 05 2026 => Jun (parts[0]), 05 (parts[1]), 2026 (parts[2])
                    let monthStr = parts[0].toLowerCase();
                    let year = parseInt(parts[2]);
                    
                    // Check if it's day-first instead, e.g. 05 Jun 2026
                    if (isNaN(day)) {
                        day = parseInt(parts[0]);
                        monthStr = parts[1].toLowerCase();
                    }

                    if (year < 100) year += 2000;
                    
                    let monthIdx = months.indexOf(monthStr.slice(0, 3));
                    if (monthIdx === -1) monthIdx = parseInt(parts[1]) - 1;

                    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12 && !isNaN(year)) {
                        date = new Date(year, monthIdx, day);
                    }
                }
            }
            if (isNaN(date.getTime())) date = new Date();

            const isCredit = tx.credit > 0 && tx.debit === 0;
            const amount = isCredit ? tx.credit : tx.debit;
            const type = isCredit ? "income" : "expense";

            if (amount === 0) continue;

            const categoryInfo = await autoCategorize(tx.description, amount, type);

            const duplicateHash = [
                date.toISOString().slice(0, 10),
                amount,
                categoryInfo.merchant.toLowerCase().trim(),
                type
            ].join("|");

            normalized.push({
                date: date.toISOString().slice(0, 10),
                description: tx.description,
                merchant: categoryInfo.merchant,
                amount,
                category: categoryInfo.category,
                type,
                duplicateHash
            });
        }

        const hashes = normalized.map(t => t.duplicateHash);
        const existingTx = await Transaction.find({
            userId: req.user._id,
            duplicateHash: { $in: hashes }
        });
        const existingHashes = new Set(existingTx.map(t => t.duplicateHash));

        const finalTx = normalized.map(t => ({
            ...t,
            isDuplicate: existingHashes.has(t.duplicateHash)
        }));

        res.json({ success: true, count: finalTx.length, transactions: finalTx });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error("Statement parse error: ", err);
        res.status(500).json({ error: "Failed to parse bank statement: " + err.message });
    }
});

// 2. Save Confirmed Transactions Route
router.post("/confirm", auth, async (req, res) => {
    try {
        const { transactions } = req.body;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: "No transactions provided for confirmation" });
        }

        const userId = req.user._id;
        const savedTransactions = [];
        let duplicateCount = 0;

        for (const tx of transactions) {
            try {
                const exists = await Transaction.findOne({ userId, duplicateHash: tx.duplicateHash });
                if (exists) {
                    duplicateCount++;
                    continue;
                }

                const newTx = new Transaction({
                    userId,
                    date: new Date(tx.date),
                    merchant: tx.merchant,
                    amount: tx.amount,
                    category: tx.category,
                    type: tx.type,
                    source: "bank_statement",
                    duplicateHash: tx.duplicateHash
                });
                await newTx.save();

                const txMonth = tx.date.slice(0, 7);
                if (tx.type === "expense") {
                    await ExpenseDoc.findOneAndUpdate(
                        { userId, month: txMonth },
                        { 
                            $push: { 
                                expenses: { 
                                    amount: tx.amount, 
                                    category: tx.category, 
                                    date: new Date(tx.date), 
                                    note: `${tx.merchant} [Imported]`,
                                    merchant: tx.merchant,
                                    source: "bank_statement"
                                } 
                            } 
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                } else {
                    await IncomeDoc.findOneAndUpdate(
                        { userId, month: txMonth },
                        { 
                            $push: { 
                                income: { 
                                    amount: tx.amount, 
                                    source: tx.category,
                                    date: new Date(tx.date), 
                                    note: `${tx.merchant} [Imported]`,
                                    merchant: tx.merchant,
                                    importSource: "bank_statement"
                                } 
                            } 
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                }

                savedTransactions.push(newTx);
            } catch (err) {
                console.error("Failed to save transaction: ", err.message);
            }
        }

        res.json({
            success: true,
            importedCount: savedTransactions.length,
            duplicateCount,
            message: `Successfully imported ${savedTransactions.length} transactions. ${duplicateCount} duplicates skipped.`
        });

    } catch (err) {
        console.error("Confirm transaction import error: ", err);
        res.status(500).json({ error: "Failed to save transactions: " + err.message });
    }
});

module.exports = router;
