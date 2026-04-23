const mongoose = require("mongoose");

const BudgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    totalBudget: { type: Number, required: true },
    categoryBudgets: [{ category: String, budget: Number }]
}, { timestamps: true });

BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Budget", BudgetSchema);