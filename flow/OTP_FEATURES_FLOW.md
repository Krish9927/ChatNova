# ChatNova — OTP Email Verification & Forgot Password

## Email Provider Setup

### Primary: Resend API (recommended, no Gmail needed)
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev      # free tier default
EMAIL_FROM_NAME=ChatNova-Support
```
Get your key at https://resend.com — free tier sends 3,000 emails/month.
For production, add a verified domain at resend.com/domains.

### Fallback: Gmail SMTP
```env
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```
**Gmail App Password** (not your real password):
1. Go to https://myaccount.google.com/apppasswords
2. 2-Step Verification must be ON
3. Create app password → name it "ChatNova"
4. Copy the 16-character password into `.env`

> If Gmail App Password stops working (error 535 5.7.8), generate a new one.
> This happens when 2FA is toggled or Google revokes old passwords.

---

## How Email Sending Works (Priority Chain)

```
sendOtpEmail() / sendWelcomeEmail() called
        ↓
emailHandler.sendEmail()
        ↓
isResendConfigured()?
  ├── YES → resendClient.emails.send(...)
  │           ↓ success → done ✓
  │           ↓ fail    → log warning, try Gmail
  └── NO  → skip Resend
        ↓
transporter.sendMail(...)  ← Gmail SMTP
  ↓ success → done ✓
  ↓ fail    → throw error → 500 response
```

Resend is tried first. Gmail is the fallback.
If both fail, signup/OTP returns a 500 error.

---

## Files Changed / Created

### Backend
| File | Change |
|------|--------|
| `backend/src/models/User.js` | Added `isVerified`, `verifyOtp`, `verifyOtpExpiry`, `resetOtp`, `resetOtpExpiry` |
| `backend/src/lib/nodemailer.js` | Gmail SMTP transporter |
| `backend/src/lib/resend.js` | Resend client + `isResendConfigured()` helper |
| `backend/src/lib/env.js` | Added `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ASSEMBLYAI_API_KEY` |
| `backend/src/emails/emailTemplates.js` | `createOtpEmailTemplate()` + `createWelcomeEmailTemplate()` |
| `backend/src/emails/emailHandler.js` | **Resend primary + Gmail fallback** — `sendOtpEmail()`, `sendWelcomeEmail()` |
| `backend/src/controllers/auth.controller.js` | `verifyEmailOtp`, `resendVerifyOtp`, `forgotPassword`, `verifyResetOtp`, `resetPassword` |
| `backend/src/routes/auth.route.js` | 5 new routes |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/store/useAuthStore.js` | `pendingEmail`, `verifyEmailOtp`, `resendVerifyOtp`, `forgotPassword`, `verifyResetOtp`, `resetPassword` |
| `frontend/src/components/OtpInput.jsx` | 6-box OTP input with auto-advance, backspace, paste |
| `frontend/src/pages/VerifyEmailPage.jsx` | OTP entry screen after signup |
| `frontend/src/pages/ForgotPasswordPage.jsx` | 3-step: email → OTP → new password |
| `frontend/src/pages/LoginPage.jsx` | "Forgot password?" link + redirect to verify if unverified |
| `frontend/src/pages/SignUpPage.jsx` | After signup → navigate to `/verify-email` |
| `frontend/src/App.jsx` | Added `/verify-email` and `/forgot-password` routes |

---

## Flow 1 — Email Verification on Signup

```
User fills signup form → clicks "Create Account"
        ↓
POST /api/auth/signup
  - saves user with isVerified: false
  - generates 6-digit OTP (valid 10 min)
  - hashes OTP → user.verifyOtp
  - sendOtpEmail(email, name, otp, "verify")
      → try Resend → fallback Gmail
  - returns { email }  (no JWT yet)
        ↓
Frontend navigates to /verify-email
User sees masked email + 6-box OTP input
        ↓
User enters OTP → clicks "Verify Email"
POST /api/auth/verify-email-otp { email, otp }
  - bcrypt.compare(otp, user.verifyOtp)
  - check Date.now() < user.verifyOtpExpiry
  - user.isVerified = true
  - user.verifyOtp = undefined  (clear it)
  - JWT cookie set (httpOnly)
  - sendWelcomeEmail()
  - returns user data
        ↓
Frontend: authUser set → App.jsx redirects to /  ✅
```

If OTP expires → click "Resend OTP" → POST /api/auth/resend-verify-otp

---

## Flow 2 — Forgot Password

```
User clicks "Forgot your password?" on login page
        ↓
/forgot-password — Step 1: Email
User enters email → POST /api/auth/forgot-password
  - generates 6-digit OTP (valid 10 min)
  - user.resetOtp = hash(otp)
  - user.resetOtpExpiry = now + 10min
  - sendOtpEmail(email, name, otp, "reset")
      → try Resend → fallback Gmail
  - always returns 200 (no user enumeration)
        ↓
Step 2: OTP
User enters 6-digit OTP → POST /api/auth/verify-reset-otp
  - bcrypt.compare(otp, user.resetOtp)
  - check not expired
  - returns 200 (OTP stays for next step)
        ↓
Step 3: New Password
User enters new password + confirm
POST /api/auth/reset-password { email, otp, password }
  - re-validates OTP (double check)
  - bcrypt.hash(newPassword)
  - user.password = hash
  - user.resetOtp = undefined
  - user.resetOtpExpiry = undefined
        ↓
Success → "Go to Login" ✅
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register, send verify OTP |
| POST | `/api/auth/verify-email-otp` | Verify email OTP → issue JWT |
| POST | `/api/auth/resend-verify-otp` | Resend email verify OTP |
| POST | `/api/auth/forgot-password` | Send password reset OTP |
| POST | `/api/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Set new password |

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `535 5.7.8 Username and Password not accepted` | Gmail App Password expired/revoked | Generate new App Password at myaccount.google.com/apppasswords |
| `EAUTH` | Gmail 2FA turned off | Re-enable 2-Step Verification, then create new App Password |
| Resend `403` | Free tier domain restriction | Use `onboarding@resend.dev` as EMAIL_FROM, or add verified domain |
| OTP expired | User waited > 10 minutes | Click "Resend OTP" |
| OTP invalid | Typo or wrong OTP | Re-enter carefully, or resend |

---

## Security Notes

- OTPs are 6-digit random numbers, expire in 10 minutes
- OTPs are **hashed** with bcrypt before storing (not plain text)
- OTPs are one-time use — cleared after successful use
- Forgot password always returns 200 (prevents email enumeration)
- JWT is only issued after email is verified
- Login blocks unverified users and redirects to OTP screen
- Gmail App Password ≠ real Gmail password — it's a separate token
