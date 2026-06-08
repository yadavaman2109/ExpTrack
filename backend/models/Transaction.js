const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    merchant: { type: String, default: "" },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    source: { type: String, default: "bank_statement" },
    duplicateHash: { type: String, required: true }
}, { timestamps: true });

// Ensure fast queries for duplicates and searching
TransactionSchema.index({ userId: 1, duplicateHash: 1 }, { unique: true });
TransactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
