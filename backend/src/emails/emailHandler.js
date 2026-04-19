/*
 * emailHandler.js
 * Primary:  Resend API (re_LunP8Hpc...)
 * Fallback: Nodemailer / Gmail SMTP
 *
 * Resend is tried first — if it fails or isn't configured, falls back to Gmail.
 */
import { resendClient, sender, isResendConfigured } from "../lib/resend.js";
import { transporter, MAIL_FROM } from "../lib/nodemailer.js";
import { createWelcomeEmailTemplate, createOtpEmailTemplate } from "./emailTemplates.js";
import { ENV } from "../lib/env.js";

async function sendEmail({ to, subject, html }) {
  // ── Try Resend first ──────────────────────────────────────────────────────
  if (isResendConfigured()) {
    try {
      await resendClient.emails.send({
        from: `${sender.name} <${sender.email}>`,
        to,
        subject,
        html,
      });
      console.log(`[email] Sent via Resend to ${to}`);
      return;
    } catch (err) {
      console.warn("[email] Resend failed, trying Gmail:", err.message);
    }
  }

  // ── Fallback: Gmail SMTP ──────────────────────────────────────────────────
  await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
  console.log(`[email] Sent via Gmail to ${to}`);
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
