const router = require("express").Router();
const auth = require("../middleware/auth");
const ExpenseDoc = require("../models/ExpenseDocument");
const IncomeDoc = require("../models/IncomeDocument");
const Budget = require("../models/Budget");
const axios = require("axios");

// Helpers to calculate last 6 months YYYY-MM
function getLast6Months() {
    const list = [];
    const date = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
        list.push(d.toISOString().slice(0, 7));
    }
    return list;
}

// Calculate the score for a specific month's data
function calculateMetricsForMonth(incomeItems, expenseItems, budgetDoc) {
    const totalIncome = incomeItems.reduce((s, c) => s + c.amount, 0);
    const totalExpenses = expenseItems.reduce((s, c) => s + c.amount, 0);
    const totalBudget = budgetDoc ? budgetDoc.totalBudget : 0;
    
    // 1. Savings Rate
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? savings / totalIncome : 0;
    let savingsScore = 0;
    if (savingsRate >= 0.3) {
        savingsScore = 40;
    } else if (savingsRate > 0) {
        savingsScore = (savingsRate / 0.3) * 40;
    }

    // 2. Budget Adherence
    let budgetScore = 20; // Default if no budget
    let budgetAdherencePct = 0;
    if (totalBudget > 0) {
        const ratio = totalExpenses / totalBudget;
        budgetAdherencePct = ratio * 100;
        if (ratio <= 0.9) {
            budgetScore = 30;
        } else if (ratio <= 1.0) {
            budgetScore = 30 - ((ratio - 0.9) / 0.1) * 15;
        } else {
            budgetScore = Math.max(0, 15 - ((ratio - 1.0) / 0.5) * 15);
        }
    }

    // 3. Volatility / Spikes (Consistency)
    const avgDaily = totalExpenses / 30;
    const spikeThreshold = Math.max(5000, 4 * avgDaily);
    const spikes = expenseItems.filter(e => {
        const category = e.category.toLowerCase();
        const desc = ((e.note || "") + " " + (e.merchant || "")).toLowerCase();
        if (category === "bills" || desc.includes("rent") || desc.includes("emi") || desc.includes("loan")) {
            return false;
        }
        return e.amount > spikeThreshold;
    });
    const spikesCount = spikes.length;
    const consistencyScore = Math.max(0, 20 - (spikesCount * 5));

    // 4. Debt Ratio (Search for keywords like loan, emi, etc.)
    const debtKeywords = ["emi", "loan", "credit card", "card payment", "mortgage", "interest", "finance"];
    const totalDebtPayments = expenseItems
        .filter(e => {
            const desc = (e.note || "").toLowerCase() + " " + (e.merchant || "").toLowerCase() + " " + e.category.toLowerCase();
            return debtKeywords.some(kw => desc.includes(kw));
        })
        .reduce((s, c) => s + c.amount, 0);

    const debtRatio = totalIncome > 0 ? totalDebtPayments / totalIncome : 0;
    let debtScore = 10;
    if (debtRatio > 0) {
        debtScore = Math.max(0, 10 - (debtRatio / 0.3) * 10);
    }

    const score = Math.round(savingsScore + budgetScore + consistencyScore + debtScore);

    // Group expenses by category for breakdown
    const categorySpend = {};
    expenseItems.forEach(e => {
        categorySpend[e.category] = (categorySpend[e.category] || 0) + e.amount;
    });

    return {
        score,
        totalIncome,
        totalExpenses,
        savings,
        savingsRate,
        totalBudget,
        budgetAdherencePct,
        totalDebtPayments,
        debtRatio,
        spikesCount,
        spikes,
        categorySpend,
        subScores: {
            savingsScore: Math.round(savingsScore),
            budgetScore: Math.round(budgetScore),
            consistencyScore: Math.round(consistencyScore),
            debtScore: Math.round(debtScore)
        }
    };
}

// Local Fallback Advisor
function generateFallbackInsights(metrics, month) {
    const score = metrics.score;
    const savingsPct = Math.round(metrics.savingsRate * 100);
    
    // Sort categories
    const sortedCats = Object.entries(metrics.categorySpend)
        .sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0]?.[0] || "None";
    const topCategoryAmt = sortedCats[0]?.[1] || 0;

    let explanation = `Your financial health score is ${score}/100. `;
    if (score >= 80) {
        explanation += "Outstanding! You maintain robust savings habits, keep a strict check on your budget, and have minimal debt burden.";
    } else if (score >= 60) {
        explanation += "Good standing. You have healthy savings and cash flow, though fine-tuning your budgets and checking large purchase spikes can boost your score.";
    } else {
        explanation += "Your finances require attention. Low savings rates or high budget utilization are putting pressure on your cash flow. Consider tightening non-essential categories.";
    }

    const spendingSummary = `This month, you took in ₹${metrics.totalIncome.toLocaleString()} and spent ₹${metrics.totalExpenses.toLocaleString()}. Your primary spending driver was ${topCategory} at ₹${topCategoryAmt.toLocaleString()}.`;

    const savingsOpportunities = [
        "Automate 15% of your income into savings immediately on salary day to build a buffer.",
    ];
    if (metrics.categorySpend["Food"] > 5000) {
        savingsOpportunities.push(`Food delivery and dining out totaled ₹${metrics.categorySpend["Food"].toLocaleString()}. Reducing this by 20% would save ₹${Math.round(metrics.categorySpend["Food"] * 0.2).toLocaleString()}.`);
    }
    if (metrics.categorySpend["Shopping"] > 4000) {
        savingsOpportunities.push(`Shopping totaled ₹${metrics.categorySpend["Shopping"].toLocaleString()}. Implement a '24-hour hold' rule for non-essential purchases.`);
    }

    const budgetRecommendations = [];
    if (metrics.totalBudget === 0) {
        budgetRecommendations.push("Initialize a monthly budget limit immediately to set targets.");
    } else {
        budgetRecommendations.push(`Maintain your overall budget below ₹${Math.round(metrics.totalIncome * 0.75).toLocaleString()} (75% of income).`);
    }
    sortedCats.slice(0, 2).forEach(([cat, amt]) => {
        budgetRecommendations.push(`Cap ${cat} at ₹${Math.round(amt * 0.85).toLocaleString()} next month (15% reduction).`);
    });

    const anomalies = metrics.spikes.map(s => {
        const dateStr = new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return `Large single-day spike of ₹${s.amount.toLocaleString()} on ${dateStr} in ${s.category}${s.note ? ` (${s.note})` : ""}.`;
    });
    if (anomalies.length === 0) {
        anomalies.push("No major spending spikes detected this month.");
    }

    const forecasts = {
        nextMonthExpense: Math.round(metrics.totalExpenses * 1.03),
        predictedSavings: Math.round(metrics.totalIncome - (metrics.totalExpenses * 1.03))
    };

    return {
        score,
        metrics: {
            savingsRate: metrics.savingsRate,
            budgetAdherence: metrics.budgetAdherencePct,
            spendingConsistency: 100 - (metrics.spikesCount * 25),
            debtRatio: metrics.debtRatio
        },
        explanation,
        spendingSummary,
        savingsOpportunities,
        budgetRecommendations,
        anomalies,
        forecasts,
        subScores: metrics.subScores
    };
}

// 1. GET /coach/health-score
router.get("/health-score", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const currentMonth = req.query.month || new Date().toISOString().slice(0, 7);
        const last6Months = getLast6Months();

        // Fetch docs for last 6 months to calculate trend
        const [expenses, incomes, budgets] = await Promise.all([
            ExpenseDoc.find({ userId, month: { $in: last6Months } }),
            IncomeDoc.find({ userId, month: { $in: last6Months } }),
            Budget.find({ userId, month: { $in: last6Months } })
        ]);

        // Calculate scores for last 6 months
        const historyScores = last6Months.map(m => {
            const expDoc = expenses.find(d => d.month === m);
            const incDoc = incomes.find(d => d.month === m);
            const budDoc = budgets.find(d => d.month === m);

            const expItems = expDoc ? expDoc.expenses : [];
            const incItems = incDoc ? incDoc.income : [];

            const mMetrics = calculateMetricsForMonth(incItems, expItems, budDoc);
            return {
                month: m,
                score: mMetrics.score,
                savings: mMetrics.savings,
                expenses: mMetrics.totalExpenses,
                income: mMetrics.totalIncome
            };
        });

        // Get detailed metrics for CURRENT requested month
        const curExpDoc = expenses.find(d => d.month === currentMonth);
        const curIncDoc = incomes.find(d => d.month === currentMonth);
        const curBudDoc = budgets.find(d => d.month === currentMonth);

        const curExpItems = curExpDoc ? curExpDoc.expenses : [];
        const curIncItems = curIncDoc ? curIncDoc.income : [];

        const curMetrics = calculateMetricsForMonth(curIncItems, curExpItems, curBudDoc);

        // Fetch up to 20 recent transactions for LLM context
        const recentTrans = [...curExpItems, ...curIncItems]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20)
            .map(t => ({
                date: t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
                amount: t.amount,
                category: t.category || t.source || "Other",
                type: t.category ? "expense" : "income",
                note: t.note || ""
            }));

        // AI Coaching Call
        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `You are JebTrack's premium AI Finance Coach.
Analyze the user's monthly financial metrics and recent transactions to output a personalized health analysis.

Metrics for month ${currentMonth}:
- Health Score (computed mathematically): ${curMetrics.score}/100
  (Breakdown: Savings Score: ${curMetrics.subScores.savingsScore}/40, Budget Score: ${curMetrics.subScores.budgetScore}/30, Consistency Score: ${curMetrics.subScores.consistencyScore}/20, Debt Score: ${curMetrics.subScores.debtScore}/10)
- Total Income: ₹${curMetrics.totalIncome}
- Total Expenses: ₹${curMetrics.totalExpenses}
- Net Savings: ₹${curMetrics.savings} (Savings Rate: ${(curMetrics.savingsRate * 100).toFixed(1)}%)
- Total Budget: ₹${curMetrics.totalBudget} (Spent: ${curMetrics.budgetAdherencePct.toFixed(1)}% of budget)
- Debt/EMI Payments: ₹${curMetrics.totalDebtPayments} (Ratio: ${(curMetrics.debtRatio * 100).toFixed(1)}%)
- Transaction Spikes Count: ${curMetrics.spikesCount}

Category spend breakdown:
${JSON.stringify(curMetrics.categorySpend)}

Recent Transactions:
${JSON.stringify(recentTrans)}

Provide real-time financial coaching. Return ONLY a valid JSON object matching the exact schema below. Do not wrap in markdown or include extra text:
{
  "score": ${curMetrics.score},
  "metrics": {
    "savingsRate": ${curMetrics.savingsRate},
    "budgetAdherence": ${curMetrics.budgetAdherencePct},
    "spendingConsistency": ${100 - (curMetrics.spikesCount * 25)},
    "debtRatio": ${curMetrics.debtRatio}
  },
  "explanation": "Summarize their overall standing, highlighting their strengths and biggest vulnerabilities.",
  "spendingSummary": "Provide a breakdown of where their money went and how it matches their income.",
  "savingsOpportunities": [
    "Opportunity 1 (actionable savings tip tailored to their actual categories)",
    "Opportunity 2 (another custom tip)"
  ],
  "budgetRecommendations": [
    "Recommendation 1 (specific budget targets based on current spending)",
    "Recommendation 2"
  ],
  "anomalies": [
    "Mention specific spike transactions from their recent list, or flag high-spending days"
  ],
  "forecasts": {
    "nextMonthExpense": ${Math.round(curMetrics.totalExpenses * 1.03)},
    "predictedSavings": ${Math.round(curMetrics.totalIncome - (curMetrics.totalExpenses * 1.03))}
  }
}`;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const response = await axios.post(geminiUrl, {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                let text = response.data.candidates[0].content.parts[0].text;
                // Clean markdown code blocks if any
                text = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
                const parsed = JSON.parse(text);
                
                return res.json({
                    success: true,
                    data: {
                        ...parsed,
                        subScores: curMetrics.subScores,
                        history: historyScores
                    }
                });
            } catch (aiErr) {
                console.error("AI Coach Gemini call failed, using fallback:", aiErr.message);
            }
        }

        // Return Fallback Insights if Gemini not configured or failed
        const fallbackData = generateFallbackInsights(curMetrics, currentMonth);
        res.json({
            success: true,
            data: {
                ...fallbackData,
                history: historyScores
            }
        });

    } catch (err) {
        console.error("Health score generation error:", err);
        res.status(500).json({ error: "Failed to generate health score: " + err.message });
    }
});

// 2. POST /coach/chat
router.post("/chat", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { message, history = [] } = req.body;
        const currentMonth = new Date().toISOString().slice(0, 7);

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Gather user data for context
        const [expDoc, incDoc, budgetDoc] = await Promise.all([
            ExpenseDoc.findOne({ userId, month: currentMonth }),
            IncomeDoc.findOne({ userId, month: currentMonth }),
            Budget.findOne({ userId, month: currentMonth })
        ]);

        const expItems = expDoc ? expDoc.expenses : [];
        const incItems = incDoc ? incDoc.income : [];

        const curMetrics = calculateMetricsForMonth(incItems, expItems, budgetDoc);

        const recentTrans = [...expItems, ...incItems]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 15)
            .map(t => ({
                date: t.date ? new Date(t.date).toISOString().slice(0, 10) : "",
                amount: t.amount,
                category: t.category || t.source || "Other",
                type: t.category ? "expense" : "income",
                note: t.note || ""
            }));

        const systemContext = `You are JebTrack's premium AI Finance Coach, an expert personal finance advisor.
Analyze the user's current month (${currentMonth}) financial state:
- Total Income: ₹${curMetrics.totalIncome}
- Total Expenses: ₹${curMetrics.totalExpenses}
- Net Savings: ₹${curMetrics.savings} (Rate: ${(curMetrics.savingsRate * 100).toFixed(1)}%)
- Total Budget: ₹${curMetrics.totalBudget} (Spent: ${curMetrics.budgetAdherencePct.toFixed(1)}%)
- Financial Health Score: ${curMetrics.score}/100
- Spikes Count: ${curMetrics.spikesCount}
- Category Spending: ${JSON.stringify(curMetrics.categorySpend)}
- Recent Transactions: ${JSON.stringify(recentTrans)}

Guidelines:
1. Provide highly personalized, friendly, and professional advice.
2. Directly answer their question using their actual numbers.
3. Keep responses relatively concise, actionable, and formatted in clean Markdown.
4. If they ask about buying something, calculate the impact on their savings rate and budget.
5. If they ask how to improve, give them 2-3 specific category targets.`;

        // Format history for Gemini API
        // Format: { role: 'user' | 'model', parts: [{ text: string }] }
        const contents = [];
        
        // Add system context as user instruction first or in system instructions if supported,
        // For gemini-2.5-flash, we can pass systemInstruction or just prepend it to the first message.
        // Let's prepend it as system instructions in the request.
        
        history.slice(-8).forEach(h => {
            contents.push({
                role: h.role === "user" ? "user" : "model",
                parts: [{ text: h.text }]
            });
        });

        // Add current user message
        contents.push({
            role: "user",
            parts: [{ text: message }]
        });

        if (process.env.GEMINI_API_KEY) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
                
                const response = await axios.post(geminiUrl, {
                    contents,
                    systemInstruction: {
                        parts: [{ text: systemContext }]
                    }
                });

                const reply = response.data.candidates[0].content.parts[0].text;
                return res.json({ success: true, message: reply });
            } catch (aiErr) {
                console.error("AI Coach Chat call failed, using fallback:", aiErr.message);
            }
        }

        // Local rule-based fallback chat responses
        let fallbackReply = "";
        const lowerMsg = message.toLowerCase();
        
        if (lowerMsg.includes("score") || lowerMsg.includes("health")) {
            fallbackReply = `Your Financial Health Score is **${curMetrics.score}/100**. Here is how you can improve it:\n\n` +
                `1. **Increase Savings Rate:** Try to save at least 30% of your income. Currently, you are saving **${Math.round(curMetrics.savingsRate * 100)}%**.\n` +
                `2. **Set budgets:** Budgets help you regulate non-essential expenses. Currently, you have spent **${Math.round(curMetrics.budgetAdherencePct)}%** of your budget.\n` +
                `3. **Avoid major spikes:** Minimize single-day purchases exceeding ₹3,000.`;
        } else if (lowerMsg.includes("save") || lowerMsg.includes("savings")) {
            fallbackReply = `Currently, your net savings for this month is **₹${curMetrics.savings.toLocaleString()}** (Savings Rate: **${Math.round(curMetrics.savingsRate * 100)}%**).\n\n` +
                `To save more, look at reducing your top expenditure categories: \n` +
                Object.entries(curMetrics.categorySpend)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([cat, amt]) => `- **${cat}**: ₹${amt.toLocaleString()}`)
                    .join("\n") +
                `\n\nAutomating transfer of 15% of your income on pay day to a separate savings account is highly recommended!`;
        } else if (lowerMsg.includes("budget")) {
            if (curMetrics.totalBudget === 0) {
                fallbackReply = `You haven't set a budget yet for this month! Setting a monthly budget limit helps keep track of your goals and boosts your financial health score. Head over to the **Budget** tab to define your targets.`;
            } else {
                fallbackReply = `You have set a budget of **₹${curMetrics.totalBudget.toLocaleString()}** and spent **₹${curMetrics.totalExpenses.toLocaleString()}** (${Math.round(curMetrics.budgetAdherencePct)}% utilization).\n\n` +
                    (curMetrics.budgetAdherencePct > 100 
                        ? `⚠️ You are currently **over budget** by ₹${(curMetrics.totalExpenses - curMetrics.totalBudget).toLocaleString()}. Consider pausing non-essential purchases.`
                        : `✅ You have ₹${(curMetrics.totalBudget - curMetrics.totalExpenses).toLocaleString()} remaining in your budget.`);
            }
        } else {
            fallbackReply = `Hi! I'm your JebTrack Finance Coach. I've analyzed your cash flow (Income: ₹${curMetrics.totalIncome.toLocaleString()}, Expenses: ₹${curMetrics.totalExpenses.toLocaleString()}, Score: ${curMetrics.score}/100).\n\n` +
                `How can I help you today? You can ask me about:\n` +
                `- *"How can I improve my financial score?"*\n` +
                `- *"What is my savings rate?"*\n` +
                `- *"Provide budget recommendations"*`;
        }

        res.json({ success: true, message: fallbackReply });

    } catch (err) {
        console.error("Chat coach error:", err);
        res.status(500).json({ error: "Failed to process chat: " + err.message });
    }
});

module.exports = router;
