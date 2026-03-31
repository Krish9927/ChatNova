import nodemailer from "nodemailer";
import { ENV } from "./env.js";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: ENV.GMAIL_USER,
        pass: ENV.GMAIL_APP_PASSWORD, // Gmail App Password (not your real password)
    },
});

export const MAIL_FROM = `ChatNova <${ENV.GMAIL_USER}>`;
