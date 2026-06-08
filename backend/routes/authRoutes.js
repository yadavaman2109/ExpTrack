const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const sendOtpMail = async (email, otp) => {
    const hasConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    const subject = "Your Jeb Track Verification Code";
    const text = `Hello,\n\nYour Jeb Track 6-digit verification code is: ${otp}\n\nThis code will expire in 5 minutes. If you did not request this, please ignore this email.`;

    if (!hasConfig) {
        console.log("=========================================");
        console.log("⚠️  EMAIL SMTP CONFIG IS MISSING IN .env");
        console.log(`✉️  Sending OTP code to: ${email}`);
        console.log(`🔑  OTP Code: ${otp}`);
        console.log("=========================================");
        return { mock: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"Jeb Track Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            text: text
        });
        console.log(`✉️  Sent OTP code successfully to: ${email}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Nodemailer send failed:", error.message);
        console.log("=========================================");
        console.log("⚠️  FALLBACK CONSOLE LOG");
        console.log(`✉️  Sending OTP code to: ${email}`);
        console.log(`🔑  OTP Code: ${otp}`);
        console.log("=========================================");
        return { mock: true, error: error.message };
    }
};

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: "All fields required" });
        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ error: "Email already registered" });
        const user = await User.create({ name, email, password });
        const token = signToken(user._id);
        res.status(201).json({ success: true, token, user });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ error: "Invalid email or password" });

        if (user.name && user.password && !user.isProfileComplete) {
            user.isProfileComplete = true;
            await user.save();
        }

        const token = signToken(user._id);
        res.json({ success: true, token, user });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post("/check-email", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required" });
        const user = await User.findOne({ email: email.toLowerCase() });
        const exists = !!(user && (user.isProfileComplete || (user.name && user.password)));
        res.json({ success: true, exists });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        let user = await User.findOne({ email: email.toLowerCase() });
        if (user && user.isProfileComplete) {
            return res.status(400).json({ error: "Email already registered. Please sign in." });
        }
        if (!user) {
            user = await User.create({
                email: email.toLowerCase(),
                isProfileComplete: false
            });
        }

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendOtpMail(user.email, otp);

        res.json({ success: true, message: "Verification code sent to your email" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: "Email and code are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.otp || user.otp !== otp.trim()) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        if (new Date() > user.otpExpires) {
            return res.status(400).json({ error: "Verification code has expired" });
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        if (user.name && user.password && !user.isProfileComplete) {
            user.isProfileComplete = true;
        }
        await user.save();

        const token = signToken(user._id);
        res.json({ success: true, token, user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/complete-profile", require("../middleware/auth"), async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) {
            return res.status(400).json({ error: "Name and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const user = req.user;
        user.name = name;
        user.password = password; // pre-save hook hashes this
        user.isProfileComplete = true;
        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get("/me", require("../middleware/auth"), (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;