const router = require("express").Router();
const auth = require("../middleware/auth");
const ExpenseDoc = require("../models/ExpenseDocument");
const mongoose = require("mongoose");

router.post("/add", auth, async (req, res) => {
    try {
        const { amount, category, date, note } = req.body;
        const userId = req.user._id;
        const month = (date ? new Date(date) : new Date()).toISOString().slice(0, 7);
        const doc = await ExpenseDoc.findOneAndUpdate(
            { userId, month },
            { $push: { expenses: { amount, category, date: date || new Date(), note } } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ success: true, expense: doc.expenses[doc.expenses.length - 1] });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get("/all", auth, async (req, res) => {
    try {
        const { month } = req.query;
        const filter = { userId: req.user._id };
        if (month) filter.month = month;
        const docs = await ExpenseDoc.find(filter).sort({ month: -1 });
        res.json({ success: true, data: docs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/update/:id", auth, async (req, res) => {
    try {
        const expenseId = new mongoose.Types.ObjectId(req.params.id);
        const { amount, category, date, note } = req.body;
        await ExpenseDoc.updateOne(
            { userId: req.user._id, "expenses._id": expenseId },
            {
                $set: {
                    "expenses.$.amount": amount, "expenses.$.category": category,
                    "expenses.$.date": date, "expenses.$.note": note
                }
            }
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete("/delete/:id", auth, async (req, res) => {
    try {
        const expenseId = new mongoose.Types.ObjectId(req.params.id);
        await ExpenseDoc.updateOne(
            { userId: req.user._id },
            { $pull: { expenses: { _id: expenseId } } }
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;