const router = require("express").Router();
const auth = require("../middleware/auth");
const ExpenseDoc = require("../models/ExpenseDocument");
const IncomeDoc = require("../models/IncomeDocument");

router.get("/monthly", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const [expenses, income] = await Promise.all([
            ExpenseDoc.aggregate([
                { $match: { userId } }, { $unwind: "$expenses" },
                { $group: { _id: "$month", totalSpent: { $sum: "$expenses.amount" }, count: { $sum: 1 } } },
                { $sort: { _id: -1 } },
                { $project: { _id: 0, month: "$_id", totalSpent: { $round: ["$totalSpent", 2] }, count: 1 } }
            ]),
            IncomeDoc.aggregate([
                { $match: { userId } }, { $unwind: "$income" },
                { $group: { _id: "$month", totalIncome: { $sum: "$income.amount" } } },
                { $project: { _id: 0, month: "$_id", totalIncome: { $round: ["$totalIncome", 2] } } }
            ])
        ]);
        const merged = expenses.map(e => {
            const inc = income.find(i => i.month === e.month);
            return {
                ...e, totalIncome: inc?.totalIncome || 0,
                netBalance: (inc?.totalIncome || 0) - e.totalSpent
            };
        });
        res.json({ success: true, data: merged });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/category", auth, async (req, res) => {
    try {
        const { month } = req.query;
        const match = { userId: req.user._id };
        if (month) match.month = month;
        const result = await ExpenseDoc.aggregate([
            { $match: match }, { $unwind: "$expenses" },
            { $group: { _id: "$expenses.category", total: { $sum: "$expenses.amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $project: { _id: 0, category: "$_id", total: { $round: ["$total", 2] }, count: 1 } }
        ]);
        res.json({ success: true, data: result, topCategory: result[0] || null });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/daily", auth, async (req, res) => {
    try {
        const { month = new Date().toISOString().slice(0, 7) } = req.query;
        const start = new Date(month + "-01");
        const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
        const result = await ExpenseDoc.aggregate([
            { $match: { userId: req.user._id, month } },
            { $unwind: "$expenses" },
            { $match: { "expenses.date": { $gte: start, $lt: end } } },
            { $group: { _id: { $dayOfMonth: "$expenses.date" }, total: { $sum: "$expenses.amount" }, count: { $sum: 1 } } },
            { $sort: { "_id": 1 } },
            { $project: { _id: 0, day: "$_id", total: { $round: ["$total", 2] }, count: 1 } }
        ]);
        res.json({ success: true, data: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/overview", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const [expAgg, incAgg] = await Promise.all([
            ExpenseDoc.aggregate([
                { $match: { userId } }, { $unwind: "$expenses" },
                {
                    $group: {
                        _id: null, total: { $sum: "$expenses.amount" },
                        avg: { $avg: "$expenses.amount" }, max: { $max: "$expenses.amount" }, count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0, total: { $round: ["$total", 2] },
                        avg: { $round: ["$avg", 2] }, max: { $round: ["$max", 2] }, count: 1
                    }
                }
            ]),
            IncomeDoc.aggregate([
                { $match: { userId } }, { $unwind: "$income" },
                { $group: { _id: null, total: { $sum: "$income.amount" } } },
                { $project: { _id: 0, total: { $round: ["$total", 2] } } }
            ])
        ]);
        const exp = expAgg[0] || { total: 0, avg: 0, max: 0, count: 0 };
        const incomeTotal = incAgg[0]?.total || 0;
        res.json({
            success: true, data: {
                ...exp, totalIncome: incomeTotal,
                netBalance: incomeTotal - exp.total
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/top", auth, async (req, res) => {
    try {
        const result = await ExpenseDoc.aggregate([
            { $match: { userId: req.user._id } }, { $unwind: "$expenses" },
            { $group: { _id: "$expenses.category", total: { $sum: "$expenses.amount" } } },
            { $sort: { total: -1 } }, { $limit: 5 },
            { $project: { _id: 0, category: "$_id", total: { $round: ["$total", 2] } } }
        ]);
        res.json({ success: true, data: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;