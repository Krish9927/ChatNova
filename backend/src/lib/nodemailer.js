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

let transportOptions;

if (ENV.SMTP_HOST) {
    console.log(`[email] Configuring SMTP with host: ${ENV.SMTP_HOST}, port: ${ENV.SMTP_PORT}`);
    transportOptions = {
        host: ENV.SMTP_HOST,
        port: parseInt(ENV.SMTP_PORT || "1025", 10),
        secure: false, // TLS is handled differently for local dev SMTP
    };
    if (ENV.SMTP_USER || ENV.SMTP_PASS) {
        transportOptions.auth = {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS,
        };
    }
} else {
    console.log(`[email] Configuring standard Gmail SMTP service for user: ${ENV.GMAIL_USER}`);
    transportOptions = {
        service: "gmail",
        auth: {
            user: ENV.GMAIL_USER,
            pass: ENV.GMAIL_APP_PASSWORD, // Gmail App Password (not your real password)
        },
    };
}

export const transporter = nodemailer.createTransport(transportOptions);

export const MAIL_FROM = ENV.SMTP_HOST
    ? `ChatNova <${ENV.EMAIL_FROM || "no-reply@chatnova.local"}>`
    : `ChatNova <${ENV.GMAIL_USER}>`;

