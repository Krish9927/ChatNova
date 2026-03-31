import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },

    // email verification
    isVerified: { type: Boolean, default: false },
    verifyOtp: { type: String },
    verifyOtpExpiry: { type: Date },

    // password reset
    resetOtp: { type: String },
    resetOtpExpiry: { type: Date },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
