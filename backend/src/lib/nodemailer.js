/*
 * NEW FILE: nodemailer.js
 * Date: 2025
 * Purpose:
 *  - Creates and exports a Nodemailer Gmail SMTP transporter
 *  - Uses GMAIL_USER and GMAIL_APP_PASSWORD from ENV (not real password — App Password)
 *  - Exports MAIL_FROM string used as the "from" field in all emails
 * Setup: Google Account → Security → 2-Step Verification → App Passwords
 * ENV vars needed: GMAIL_USER, GMAIL_APP_PASSWORD
 */
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
