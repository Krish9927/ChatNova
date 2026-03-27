export function createWelcomeEmailTemplate(name, clientURL) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ChatNova</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #374151; max-width: 680px; margin: 0 auto; background-color: #f3f4f6; padding: 24px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);">
            <tr style="background: linear-gradient(90deg, #2563eb 0%, #7c3aed 100%);">
              <td style="padding: 24px; text-align: left; color: #ffffff;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:48px; height:48px; border-radius:8px; background:#ffffff22; display:flex; align-items:center; justify-content:center; font-weight:700;">CN</div>
                  <div style="font-size:18px; font-weight:600;">ChatNova</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                <p style="margin:0 0 16px 0; font-size:18px; color:#111827;"><strong>Hello ${name},</strong></p>
                <p style="margin:0 0 16px 0; font-size:15px; color:#374151;">Thank you for creating an account with ChatNova. We're committed to providing a secure, reliable platform for your conversations.</p>
                <p style="margin:0 0 20px 0; font-size:15px; color:#374151;">To get started, you can access your dashboard and personalize your account.</p>

                <div style="text-align:center; margin:24px 0;">
                  <a href="${clientURL}" style="background-color:#2563eb; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600; display:inline-block;">Get started</a>
                </div>

                <ul style="color:#374151; padding-left:20px; margin:0 0 20px 0;">
                  <li style="margin-bottom:6px;">Complete your profile</li>
                  <li style="margin-bottom:6px;">Connect with colleagues and friends</li>
                  <li style="margin-bottom:0;">Explore security and privacy settings</li>
                </ul>

                <p style="margin:0 0 6px 0; font-size:14px; color:#6b7280;">If you need assistance, contact our support team at <a href="mailto:support@chatnova.com" style="color:#2563eb; text-decoration:none;">support@chatnova.com</a>.</p>

                <p style="margin:20px 0 0 0; font-size:14px; color:#6b7280;">Best regards,<br/>The ChatNova Team</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb; padding:16px 24px; text-align:center; color:#9ca3af; font-size:13px;">
                <div>© ${new Date().getFullYear()} ChatNova. All rights reserved.</div>
                <div style="margin-top:8px;">
                  <a href="#" style="color:#6b7280; text-decoration:none; margin:0 8px;">Privacy Policy</a>
                  <a href="#" style="color:#6b7280; text-decoration:none; margin:0 8px;">Terms</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}