const mongoose = require("mongoose");

const ExpenseItemSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    category: {
        type: String, required: true,
        enum: ["Food", "Travel", "Shopping", "Health", "Entertainment", "Bills", "Education", "Other"]
    },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    merchant: { type: String, default: "" },
    source: { type: String, default: "manual" }
});

const ExpenseDocSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    expenses: { type: [ExpenseItemSchema], default: [] }
}, { timestamps: true });

ExpenseDocSchema.index({ userId: 1, month: 1 }, { unique: true });
ExpenseDocSchema.index({ "expenses.category": 1 });

module.exports = mongoose.model("ExpenseDocument", ExpenseDocSchema);