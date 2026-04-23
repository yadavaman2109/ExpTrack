require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/authRoutes"));
app.use("/expenses", require("./routes/expenseRoutes"));
app.use("/income", require("./routes/incomeRoutes"));
app.use("/analytics", require("./routes/analyticsRoutes"));
app.use("/budget", require("./routes/budgetRoutes"));

app.get("/", (req, res) => res.json({ message: "API running" }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌", err));

app.listen(process.env.PORT || 5000,
    () => console.log(`🚀 Server on port ${process.env.PORT || 5000}`));