require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/authRoutes"));
app.use("/expenses", require("./routes/expenseRoutes"));
app.use("/income", require("./routes/incomeRoutes"));
app.use("/analytics", require("./routes/analyticsRoutes"));
app.use("/budget", require("./routes/budgetRoutes"));
app.use("/import", require("./routes/importRoutes"));
app.use("/coach", require("./routes/coachRoutes"));

// Serve static assets from frontend build in production
const frontendBuildPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
} else {
    app.get("/", (req, res) => res.json({ message: "API running" }));
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌", err));

app.listen(process.env.PORT || 5000,
    () => console.log(`🚀 Server on port ${process.env.PORT || 5000}`));