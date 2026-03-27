import { resendClient, sender, isResendConfigured } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "../emails/emailTemplates.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
  // Validate resend configuration and sender email before attempting send
  if (!isResendConfigured()) {
    console.error('Resend not configured or sender email invalid:', sender);
    throw new Error('Resend not configured or sender email invalid. Set a verified EMAIL_FROM and RESEND_API_KEY. Verify domain at https://resend.com/domains');
  }

  // sanitize sender values
  const fromAddress = `${(sender.name || 'ChatNova').trim()} <${(sender.email || '').trim()}>`;

  try {
    const resp = await resendClient.emails.send({
      from: fromAddress,
      to: email,
      subject: "Welcome to ChatNova!",
      html: createWelcomeEmailTemplate(name, clientURL),
    });

    console.log("Welcome Email sent successfully", resp);
    return resp;
  } catch (err) {
    // Log detailed error from Resend and surface a clearer message
    console.error("Error sending welcome email:", err?.response?.data || err);
    throw new Error("Failed to send welcome email: " + (err?.message || 'unknown error'));
  }
};