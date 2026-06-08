require("dotenv").config();
const nodemailer = require("nodemailer");

const sendOtpMail = async (email, otp) => {
    const hasConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    const subject = "Your Jeb Track Verification Code";
    const text = `Hello,\n\nYour Jeb Track 6-digit verification code is: ${otp}`;

    if (!hasConfig) {
        console.log("⚠️ EMAIL SMTP CONFIG IS MISSING");
        return;
    }

    console.log("Connecting to SMTP...");
    const start = Date.now();
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
        console.log(`✅ Sent successfully in ${(Date.now() - start)/1000}s`);
    } catch (error) {
        console.error(`❌ Failed after ${(Date.now() - start)/1000}s:`, error.message);
    }
};

sendOtpMail("testotp@example.com", "123456");
