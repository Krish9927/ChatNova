import { Resend } from "resend";
import {ENV} from "./env.js";

const apiKey = (ENV.RESEND_API_KEY || '').trim();
export const resendClient = apiKey ? new Resend(apiKey) : null;

const rawEmail = ENV.EMAIL_FROM || '';
const rawName = ENV.EMAIL_FROM_NAME || 'ChatNova';

export const sender = {
  email: rawEmail.trim(),
  name: rawName.trim(),
};

export function isResendConfigured() {
  return Boolean(resendClient && sender.email && sender.email.includes('@'));
}