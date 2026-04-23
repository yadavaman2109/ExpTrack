const mongoose = require("mongoose");

const IncomeItemSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    source: {
        type: String, required: true,
        enum: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"]
    },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" }
});

const IncomeDocSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    income: { type: [IncomeItemSchema], default: [] }
}, { timestamps: true });

IncomeDocSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("IncomeDocument", IncomeDocSchema);
