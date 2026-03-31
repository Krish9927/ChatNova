export function createWelcomeEmailTemplate(name, clientURL) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to ChatNova</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,#2563eb,#7c3aed);padding:28px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">ChatNova 💬</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 12px;font-size:16px;color:#111827;">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Your account is verified and ready. Welcome to ChatNova — start chatting now!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 24px;">
                <a href="${clientURL}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                          font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
                  Open ChatNova
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;
                     border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ChatNova. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function createOtpEmailTemplate(name, otp, purpose) {
  const title = purpose === "verify" ? "Verify your email" : "Reset your password";
  const subtitle = purpose === "verify"
    ? "Use the OTP below to verify your ChatNova account. It expires in 10 minutes."
    : "Use the OTP below to reset your ChatNova password. It expires in 10 minutes.";
  const headerColor = purpose === "verify" ? "#2563eb" : "#dc2626";

  // render each digit as its own table cell so nothing overflows
  const digitCells = otp.split("").map(d =>
    `<td style="width:44px;height:52px;text-align:center;vertical-align:middle;
                background:#f1f5f9;border:2px solid #2563eb;border-radius:8px;
                font-size:28px;font-weight:800;color:#2563eb;
                font-family:Arial,sans-serif;">${d}</td>
     <td style="width:8px;"></td>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,${headerColor},#7c3aed);
                     padding:28px 32px;border-radius:12px 12px 0 0;">
            <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">ChatNova 💬</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${title}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;
                     border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

            <p style="margin:0 0 8px;font-size:16px;color:#111827;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
              ${subtitle}
            </p>

            <!-- OTP digits — one cell per digit, no overflow -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>${digitCells}</tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">
              ⏱ This OTP is valid for <strong>10 minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;
                     border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ChatNova. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
