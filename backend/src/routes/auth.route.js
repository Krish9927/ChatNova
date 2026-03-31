import express from "express";
import {
    signup, login, logout, updateProfile,
    verifyEmailOtp, resendVerifyOtp,
    forgotPassword, verifyResetOtp, resetPassword,
} from "../controllers/auth.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";
import arcjetProtection from "../middleware/arcjet.middleware.js";

const router = express.Router();
router.use(arcjetProtection);

// auth
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.put("/update-profile", protectedRoute, updateProfile);

// email verification OTP
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-verify-otp", resendVerifyOtp);

// forgot / reset password OTP
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

router.get("/check-auth", protectedRoute, (req, res) => {
    const u = req.user;
    res.status(200).json({
        _id: u._id,
        fullName: u.username,
        email: u.email,
        profilePic: u.profilePic,
        isVerified: u.isVerified,
    });
});

export default router;
