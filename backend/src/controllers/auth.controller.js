/*
 * CHANGED: auth.controller.js
 * Date: 2025
 * Changes:
 *  - Replaced Resend with Nodemailer (Gmail SMTP) for all email sending
 *  - Added OTP-based email verification flow (signup → OTP → verify → JWT)
 *  - Added forgot password OTP flow (email → OTP → verify → reset password)
 *  - signup: if email exists but unverified, deletes old record and re-registers
 *  - login: if user unverified, auto-sends fresh OTP and returns needsVerification flag
 *  - Added verifyEmailOtp, resendVerifyOtp, forgotPassword, verifyResetOtp, resetPassword
 * Imports added: sendOtpEmail from emailHandler.js
 */
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail, sendOtpEmail } from "../emails/emailHandler.js";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";

// generate a 6-digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_TTL = 10 * 60 * 1000; // 10 minutes

// ─── SIGNUP ──────────────────────────────────────────────────────────────────
// Step 1: register user, send verify OTP
export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        if (!fullName || !email || !password)
            return res.status(400).json({ message: "All fields are required" });
        if (password.length < 6)
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ message: "Invalid email format" });

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // if already verified, reject
            if (existingUser.isVerified)
                return res.status(400).json({ message: "Email already exists" });
            // if unverified, delete the old record and let them re-register
            await User.deleteOne({ email });
        }

        const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
        const otp = generateOtp();

        const newUser = new User({
            username: fullName,
            email,
            password: hashedPassword,
            isVerified: false,
            verifyOtp: otp,
            verifyOtpExpiry: new Date(Date.now() + OTP_TTL),
        });
        await newUser.save();

        // send OTP email (non-blocking — don't fail signup if email fails)
        sendOtpEmail(email, fullName, otp, "verify").catch(console.error);

        res.status(201).json({
            message: "Account created. Check your email for the OTP.",
            email, // send back so frontend can pre-fill the verify screen
        });
    } catch (error) {
        console.error("Error in signup:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Step 2: verify OTP → issue JWT → enter app
export const verifyEmailOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp)
            return res.status(400).json({ message: "Email and OTP are required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

        if (user.verifyOtp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });
        if (new Date() > user.verifyOtpExpiry)
            return res.status(400).json({ message: "OTP expired. Request a new one." });

        user.isVerified = true;
        user.verifyOtp = undefined;
        user.verifyOtpExpiry = undefined;
        await user.save();

        generateToken(user._id, res);
        sendWelcomeEmail(user.email, user.username).catch(console.error);

        res.status(200).json({
            _id: user._id,
            fullName: user.username,
            email: user.email,
            profilePic: user.profilePic,
            isVerified: true,
        });
    } catch (error) {
        console.error("Error in verifyEmailOtp:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Resend verify OTP
export const resendVerifyOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "Email already verified" });

        const otp = generateOtp();
        user.verifyOtp = otp;
        user.verifyOtpExpiry = new Date(Date.now() + OTP_TTL);
        await user.save();

        await sendOtpEmail(email, user.username, otp, "verify");
        res.status(200).json({ message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error in resendVerifyOtp:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
// Step 1: send reset OTP
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        // always 200 — don't reveal if email exists
        if (!user) return res.status(200).json({ message: "If that email exists, an OTP has been sent." });

        const otp = generateOtp();
        user.resetOtp = otp;
        user.resetOtpExpiry = new Date(Date.now() + OTP_TTL);
        await user.save();

        await sendOtpEmail(email, user.username, otp, "reset");
        res.status(200).json({ message: "If that email exists, an OTP has been sent." });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Step 2: verify reset OTP
export const verifyResetOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp)
            return res.status(400).json({ message: "Email and OTP are required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.resetOtp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });
        if (new Date() > user.resetOtpExpiry)
            return res.status(400).json({ message: "OTP expired. Request a new one." });

        // OTP is valid — don't clear yet, needed for reset step
        res.status(200).json({ message: "OTP verified", email });
    } catch (error) {
        console.error("Error in verifyResetOtp:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Step 3: set new password
export const resetPassword = async (req, res) => {
    const { email, otp, password } = req.body;
    try {
        if (!email || !otp || !password)
            return res.status(400).json({ message: "All fields are required" });
        if (password.length < 6)
            return res.status(400).json({ message: "Password must be at least 6 characters" });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.resetOtp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });
        if (new Date() > user.resetOtpExpiry)
            return res.status(400).json({ message: "OTP expired. Request a new one." });

        user.password = await bcrypt.hash(password, await bcrypt.genSalt(10));
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password)
            return res.status(400).json({ message: "All fields are required" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        if (!user.isVerified) {
            // resend a fresh OTP so they can verify right from the login screen
            const otp = generateOtp();
            user.verifyOtp = otp;
            user.verifyOtpExpiry = new Date(Date.now() + OTP_TTL);
            await user.save();
            sendOtpEmail(user.email, user.username, otp, "verify").catch(console.error);
            return res.status(403).json({ message: "Please verify your email. A new OTP has been sent.", email, needsVerification: true });
        }

        generateToken(user._id, res);
        res.status(200).json({
            _id: user._id,
            fullName: user.username,
            email: user.email,
            profilePic: user.profilePic,
            isVerified: user.isVerified,
        });
    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = (_, res) => {
    res.clearCookie("jwt", { httpOnly: true, sameSite: "lax", secure: ENV.NODE_ENV === "production" });
    res.status(200).json({ message: "Logged out successfully" });
};

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
    const { profilePic } = req.body;
    try {
        const userId = req.user._id;
        const uploadResult = await cloudinary.uploader.upload(profilePic, {
            folder: "chatnova/profile_pics",
            public_id: `profile_${userId}`,
            overwrite: true,
            resource_type: "image",
        });
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResult.secure_url },
            { new: true, select: "-password -__v" }
        );
        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            _id: updatedUser._id,
            fullName: updatedUser.username,
            email: updatedUser.email,
            profilePic: updatedUser.profilePic,
            isVerified: updatedUser.isVerified,
        });
    } catch (error) {
        console.error("Error in updateProfile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
