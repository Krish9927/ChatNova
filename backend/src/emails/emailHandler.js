/**
 * emailHandler.js
 * Uses Nodemailer (Gmail SMTP) only.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
 */
import { transporter, MAIL_FROM } from "../lib/nodemailer.js";
import {
  createWelcomeEmailTemplate,
  createOtpEmailTemplate,
  createNewMessageEmailTemplate,
  createFriendRequestEmailTemplate,
} from "./emailTemplates.js";
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
    html: createWelcomeEmailTemplate(name, ENV.APP_URL),
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

export const sendNewMessageNotification = async (email, recipientName, senderName, messagePreview) => {
  await sendEmail({
    to: email,
    subject: `💬 New message from ${senderName} — ChatNova`,
    html: createNewMessageEmailTemplate(recipientName, senderName, messagePreview, ENV.APP_URL),
  });
};

export const sendFriendRequestNotification = async (email, recipientName, senderName) => {
  await sendEmail({
    to: email,
    subject: `👋 ${senderName} sent you a friend request — ChatNova`,
    html: createFriendRequestEmailTemplate(recipientName, senderName, ENV.APP_URL),
  });
}; 