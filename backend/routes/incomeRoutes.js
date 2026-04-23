const router = require("express").Router();
const auth = require("../middleware/auth");
const IncomeDoc = require("../models/IncomeDocument");
const mongoose = require("mongoose");

router.post("/add", auth, async (req, res) => {
    try {
        const { amount, source, date, note } = req.body;
        const userId = req.user._id;
        const month = (date ? new Date(date) : new Date()).toISOString().slice(0, 7);
        const doc = await IncomeDoc.findOneAndUpdate(
            { userId, month },
            { $push: { income: { amount, source, date: date || new Date(), note } } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ success: true, item: doc.income[doc.income.length - 1] });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get("/all", auth, async (req, res) => {
    try {
        const { month } = req.query;
        const filter = { userId: req.user._id };
        if (month) filter.month = month;
        const docs = await IncomeDoc.find(filter).sort({ month: -1 });
        res.json({ success: true, data: docs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/delete/:id", auth, async (req, res) => {
    try {
        const incomeId = new mongoose.Types.ObjectId(req.params.id);
        await IncomeDoc.updateOne(
            { userId: req.user._id },
            { $pull: { income: { _id: incomeId } } }
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get("/monthly", auth, async (req, res) => {
    try {
        const result = await IncomeDoc.aggregate([
            { $match: { userId: req.user._id } },
            { $unwind: "$income" },
            { $group: { _id: "$month", total: { $sum: "$income.amount" }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $project: { _id: 0, month: "$_id", total: { $round: ["$total", 2] }, count: 1 } }
        ]);
        res.json({ success: true, data: result });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;