/*
 * CHANGED: emailHandler.js
 * Date: 2025
 * Changes:
 *  - Replaced Resend client with Nodemailer transporter
 *  - sendWelcomeEmail: now uses nodemailer + createWelcomeEmailTemplate
 *  - Added sendOtpEmail(email, name, otp, purpose): sends verify or reset OTP email
 * Imports added: transporter, MAIL_FROM from ../lib/nodemailer
 *               createOtpEmailTemplate from ./emailTemplates
 */
import { transporter, MAIL_FROM } from "../lib/nodemailer.js";
import { createWelcomeEmailTemplate, createOtpEmailTemplate } from "./emailTemplates.js";
import { ENV } from "../lib/env.js";

export const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Welcome to ChatNova!",
    html: createWelcomeEmailTemplate(name, ENV.CLIENT_URL),
  });
};

export const sendOtpEmail = async (email, name, otp, purpose) => {
  const subject = purpose === "verify"
    ? "ChatNova — Your email verification OTP"
    : "ChatNova — Your password reset OTP";

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject,
    html: createOtpEmailTemplate(name, otp, purpose),
  });
};
