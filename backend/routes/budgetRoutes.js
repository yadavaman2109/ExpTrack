const router = require("express").Router();
const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const ExpenseDoc = require("../models/ExpenseDocument");

router.post("/set", auth, async (req, res) => {
    try {
        const { month, totalBudget, categoryBudgets } = req.body;
        const doc = await Budget.findOneAndUpdate(
            { userId: req.user._id, month },
            { $set: { totalBudget, categoryBudgets } },
            { upsert: true, new: true }
        );
        res.json({ success: true, budget: doc });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get("/status", auth, async (req, res) => {
    try {
        const { month } = req.query;
        const [budget, spendingAgg] = await Promise.all([
            Budget.findOne({ userId: req.user._id, month }),
            ExpenseDoc.aggregate([
                { $match: { userId: req.user._id, month } }, { $unwind: "$expenses" },
                { $group: { _id: "$expenses.category", spent: { $sum: "$expenses.amount" } } }
            ])
        ]);
        if (!budget) return res.status(404).json({ error: "No budget set" });
        const totalSpent = spendingAgg.reduce((s, c) => s + c.spent, 0);
        const isOverBudget = totalSpent > budget.totalBudget;
        const utilizationPct = budget.totalBudget > 0
            ? Math.round((totalSpent / budget.totalBudget) * 100) : 0;
        const categoryStatus = (budget.categoryBudgets || []).map(cb => {
            const a = spendingAgg.find(s => s._id === cb.category);
            const spent = a ? a.spent : 0;
            return {
                category: cb.category, budget: cb.budget,
                spent: Math.round(spent * 100) / 100,
                remaining: Math.round((cb.budget - spent) * 100) / 100,
                isOver: spent > cb.budget
            };
        });
        res.json({
            success: true, data: {
                month, totalBudget: budget.totalBudget,
                totalSpent: Math.round(totalSpent * 100) / 100,
                remaining: Math.round((budget.totalBudget - totalSpent) * 100) / 100,
                isOverBudget, utilizationPct, categoryStatus,
                alert: isOverBudget
                    ? `Over budget by ₹${(totalSpent - budget.totalBudget).toFixed(2)}`
                    : utilizationPct >= 80 ? `${utilizationPct}% of budget used` : null
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;