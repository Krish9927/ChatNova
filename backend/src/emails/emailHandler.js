/**
 * emailHandler.js
 * Uses Nodemailer (Gmail SMTP) only.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */
import { transporter, MAIL_FROM } from "../lib/nodemailer.js";
import { createWelcomeEmailTemplate, createOtpEmailTemplate } from "./emailTemplates.js";
import { ENV } from "../lib/env.js";

async function sendEmail({ to, subject, html }) {
  console.log(`[email] Sending to ${to} via Gmail SMTP (${ENV.GMAIL_USER})`);
  try {
    const info = await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
    console.log(`[email] Sent successfully. MessageId: ${info.messageId}`);
  } catch (err) {
    console.error(`[email] FAILED to send to ${to}:`, err.message);
    throw err; // re-throw so the controller can return a 500
  }
}

export const sendWelcomeEmail = async (email, name) => {
  await sendEmail({
    to: email,
    subject: "Welcome to ChatNova!",
    html: createWelcomeEmailTemplate(name, ENV.CLIENT_URL),
  });
};

export const sendOtpEmail = async (email, name, otp, purpose) => {
  const subject = purpose === "verify"
    ? "ChatNova — Your email verification OTP"
    : "ChatNova — Your password reset OTP";

  await sendEmail({
    to: email,
    subject,
    html: createOtpEmailTemplate(name, otp, purpose),
  });
}; 