# ChatNova — OTP Email Verification & Forgot Password

## Setup (Do This First)

### 1. Get a Gmail App Password
- Google Account → Security → 2-Step Verification → App Passwords
- Create one for "Mail" → copy the 16-character password

### 2. Fill in `backend/.env`
```env
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## Files Changed / Created

### Backend
| File | Change |
|------|--------|
| `backend/src/models/User.js` | Added `isVerified`, `verifyOtp`, `verifyOtpExpiry`, `resetOtp`, `resetOtpExpiry` |
| `backend/src/lib/nodemailer.js` | NEW — Gmail SMTP transporter |
| `backend/src/lib/env.js` | Added `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| `backend/src/emails/emailTemplates.js` | Added `createOtpEmailTemplate()` with styled OTP box |
| `backend/src/emails/emailHandler.js` | Replaced Resend with nodemailer, added `sendOtpEmail()` |
| `backend/src/controllers/auth.controller.js` | Added `verifyEmailOtp`, `resendVerifyOtp`, `forgotPassword`, `verifyResetOtp`, `resetPassword` |
| `backend/src/routes/auth.route.js` | Added 5 new routes |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/store/useAuthStore.js` | Added `pendingEmail`, `verifyEmailOtp`, `resendVerifyOtp`, `forgotPassword`, `verifyResetOtp`, `resetPassword` |
| `frontend/src/components/OtpInput.jsx` | NEW — 6-box OTP input with auto-advance, backspace, paste support |
| `frontend/src/pages/VerifyEmailPage.jsx` | NEW — OTP entry screen after signup |
| `frontend/src/pages/ForgotPasswordPage.jsx` | NEW — 3-step: email → OTP → new password |
| `frontend/src/pages/LoginPage.jsx` | Added "Forgot your password?" link + navigate to verify if unverified |
| `frontend/src/pages/SignUpPage.jsx` | After signup, navigates to `/verify-email` |
| `frontend/src/App.jsx` | Added `/verify-email` and `/forgot-password` routes |

---

## Flow 1 — Email Verification on Signup

```
User fills signup form → clicks "Create Account"
        ↓
POST /api/auth/signup
  - saves user with isVerified: false
  - generates 6-digit OTP (valid 10 min)
  - sends OTP email via Gmail SMTP
  - returns { email } (no JWT yet)
        ↓
Frontend navigates to /verify-email
User sees masked email + 6-box OTP input
        ↓
User enters OTP → clicks "Verify Email"
POST /api/auth/verify-email-otp { email, otp }
  - checks OTP matches + not expired
  - sets isVerified = true, clears OTP fields
  - issues JWT cookie
  - sends welcome email
  - returns user data
        ↓
Frontend sets authUser → App.jsx redirects to /  ✅
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
  - saves to user.resetOtp + resetOtpExpiry
  - sends OTP email via Gmail SMTP
  - always returns 200 (security: no user enumeration)
        ↓
Step 2: OTP
User enters 6-digit OTP → POST /api/auth/verify-reset-otp
  - checks OTP matches + not expired
  - returns 200 (OTP stays in DB for next step)
        ↓
Step 3: New Password
User enters new password + confirm
POST /api/auth/reset-password { email, otp, password }
  - re-validates OTP (double check)
  - hashes new password, saves it
  - clears resetOtp + resetOtpExpiry
        ↓
Success screen → "Go to Login" ✅
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

## Security Notes
- OTPs are 6-digit random numbers, expire in 10 minutes
- OTPs are one-time use (cleared after successful reset)
- Forgot password always returns the same message (prevents email enumeration)
- JWT is only issued after email is verified
- Login blocks unverified users and redirects them to OTP screen
