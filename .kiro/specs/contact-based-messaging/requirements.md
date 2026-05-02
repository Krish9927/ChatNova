# Requirements Document

## Introduction

This feature enforces contact-based restrictions across the ChatNova application. Currently, any
authenticated user can send direct messages to any other user and be added to any group regardless
of whether a mutual contact relationship (accepted friend request) exists. This feature closes that
gap by:

1. **Blocking DM messaging** between users who are not in each other's contact list.
2. **Blocking group membership** for users who are not contacts of the group creator.
3. **Restricting the group-creation member picker** to show only the creator's contacts.
4. **Adding OTP email verification on signup** — currently the signup flow sets `isVerified: true`
   immediately without sending or verifying an OTP. The forgot-password flow already sends OTPs
   correctly; signup must be brought to parity.
5. **Updating flow documentation** in `/flow` to reflect all of the above changes.

---

## Glossary

- **Contact**: A pair of users who have an accepted `FriendRequest` record in the database.
- **Contact_List**: The set of all accepted contacts for a given user, returned by `GET /api/friends`.
- **Messaging_Guard**: The backend middleware/logic that checks contact status before allowing a message to be sent.
- **Group_Guard**: The backend middleware/logic that checks contact status before allowing a user to be added to a group.
- **OTP**: A 6-digit one-time password, valid for 10 minutes, hashed with bcrypt before storage.
- **Signup_OTP_Flow**: The sequence: register → send verify OTP to email → user enters OTP → account verified → JWT issued.
- **Auth_Controller**: `backend/src/controllers/auth.controller.js`
- **Message_Controller**: `backend/src/controllers/message.controller.js`
- **Group_Controller**: `backend/src/controllers/group.controller.js`
- **Friend_Controller**: `backend/src/controllers/friend.controller.js`
- **CreateGroupModal**: `frontend/src/components/CreateGroupModal.jsx`
- **FriendStore**: `frontend/src/store/useFriendStore.js`
- **AuthStore**: `frontend/src/store/useAuthStore.js`

---

## Requirements

### Requirement 1: Contact-Gated Direct Messaging

**User Story:** As a user, I want to be able to send direct messages only to people in my contact
list, so that strangers cannot message me and I cannot accidentally message someone I have not
connected with.

#### Acceptance Criteria

1. WHEN a user sends a direct message, THE Messaging_Guard SHALL verify that an accepted
   `FriendRequest` record exists between the sender and the receiver before saving the message.

2. IF no accepted `FriendRequest` record exists between the sender and the receiver, THEN THE
   Messaging_Guard SHALL reject the request with HTTP 403 and the message
   `"You can only message your contacts"`.

3. WHEN a user attempts to fetch message history with a non-contact, THE Message_Controller SHALL
   return HTTP 403 with the message `"You can only view messages with your contacts"`.

4. THE Messaging_Guard SHALL apply the contact check to both text/image messages
   (`POST /api/messages/send/:id`) and audio messages (`POST /api/messages/send/:id/audio`).

5. IF the sender and receiver are contacts, THEN THE Messaging_Guard SHALL allow the message to
   proceed without additional restrictions.

---

### Requirement 2: Contact-Gated Group Membership

**User Story:** As a group admin, I want to add only my contacts to a group, so that I cannot
accidentally expose group conversations to strangers.

#### Acceptance Criteria

1. WHEN a group is created, THE Group_Guard SHALL verify that every user in `memberIds` is an
   accepted contact of the group creator before saving the group.

2. IF any user in `memberIds` is not an accepted contact of the group creator, THEN THE
   Group_Guard SHALL reject the request with HTTP 403 and the message
   `"You can only add contacts to a group"`.

3. WHEN an admin adds new members via `POST /api/groups/:id/members`, THE Group_Guard SHALL
   verify that every user in `memberIds` is an accepted contact of the requesting admin.

4. IF any user in the add-members request is not an accepted contact of the admin, THEN THE
   Group_Guard SHALL reject the request with HTTP 403 and the message
   `"You can only add contacts to a group"`.

5. THE Group_Guard SHALL allow the group creator (admin) to always be included as a member
   without a contact-check against themselves.

---

### Requirement 3: Contact-Only Member Picker in Group Creation UI

**User Story:** As a user creating a group, I want the member picker to show only my contacts,
so that I am not confused by seeing users I cannot add.

#### Acceptance Criteria

1. WHEN the CreateGroupModal is opened, THE CreateGroupModal SHALL display only users from the
   authenticated user's Contact_List in the member picker.

2. THE CreateGroupModal SHALL fetch the Contact_List via `useFriendStore.fetchFriends()` and
   render the `friends` array as the selectable member list.

3. IF the authenticated user has no contacts, THE CreateGroupModal SHALL display the message
   `"No contacts yet. Add friends first."` in the member picker area.

4. THE CreateGroupModal SHALL show each contact's profile picture, username, and a checkmark
   indicator when selected.

5. WHEN a contact is selected or deselected, THE CreateGroupModal SHALL update the selected
   member count label in real time.

---

### Requirement 4: OTP Email Verification on Signup

**User Story:** As a new user, I want to verify my email address with an OTP when I create an
account, so that only real email owners can register and my account is protected from the start.

#### Acceptance Criteria

1. WHEN a new user submits the signup form, THE Auth_Controller SHALL generate a 6-digit OTP,
   hash it with bcrypt, store the hash in `user.verifyOtp`, set `user.verifyOtpExpiry` to
   10 minutes from now, set `user.isVerified` to `false`, and save the user — without issuing
   a JWT.

2. WHEN the user record is saved during signup, THE Auth_Controller SHALL call
   `sendOtpEmail(email, username, otp, "verify")` to deliver the OTP to the user's email address.

3. WHEN signup succeeds, THE Auth_Controller SHALL return HTTP 201 with `{ email }` only (no JWT,
   no user object) so the frontend can navigate to the OTP verification screen.

4. WHEN the frontend receives the signup success response, THE AuthStore SHALL store the email in
   `pendingEmail` state and navigate the user to `/verify-email`.

5. WHEN a user submits the correct OTP on the verify-email screen, THE Auth_Controller SHALL
   set `user.isVerified = true`, clear `verifyOtp` and `verifyOtpExpiry`, issue a JWT cookie,
   send a welcome email, and return the full user object.

6. IF the submitted OTP does not match the stored hash, THEN THE Auth_Controller SHALL return
   HTTP 400 with the message `"Invalid OTP"`.

7. IF the submitted OTP has expired (current time exceeds `verifyOtpExpiry`), THEN THE
   Auth_Controller SHALL return HTTP 400 with the message `"OTP expired. Request a new one."`.

8. WHEN a user requests OTP resend via `POST /api/auth/resend-verify-otp`, THE Auth_Controller
   SHALL generate a new OTP, update `verifyOtp` and `verifyOtpExpiry`, and send a new OTP email.

9. IF a signup is attempted with an email that already exists and `isVerified` is `false`, THEN
   THE Auth_Controller SHALL delete the old unverified record and allow re-registration with a
   fresh OTP.

10. IF a signup is attempted with an email that already exists and `isVerified` is `true`, THEN
    THE Auth_Controller SHALL return HTTP 400 with the message `"Email already exists"`.

11. WHEN a user attempts to log in with an unverified account, THE Auth_Controller SHALL send a
    fresh OTP to the user's email and return HTTP 403 with
    `{ message: "Please verify your email", needsVerification: true, email }`.

---

### Requirement 5: Forgot Password OTP Flow (Existing — Verify Parity)

**User Story:** As a user who has forgotten their password, I want to receive an OTP on my
registered email to reset it, so that I can regain access to my account securely.

#### Acceptance Criteria

1. WHEN a user submits their email on the forgot-password screen, THE Auth_Controller SHALL
   generate a 6-digit OTP, hash it, store it in `user.resetOtp` and `user.resetOtpExpiry`
   (10 minutes), and call `sendOtpEmail(email, username, otp, "reset")`.

2. THE Auth_Controller SHALL always return HTTP 200 for the forgot-password request regardless
   of whether the email exists, to prevent user enumeration.

3. WHEN a user submits the reset OTP, THE Auth_Controller SHALL compare it against the stored
   hash and verify it has not expired before returning HTTP 200.

4. WHEN a user submits a new password with a valid OTP, THE Auth_Controller SHALL hash the new
   password, save it, and clear `resetOtp` and `resetOtpExpiry`.

5. IF the reset OTP is invalid or expired, THEN THE Auth_Controller SHALL return HTTP 400 with
   an appropriate error message.

---

### Requirement 6: Flow Documentation Updates

**User Story:** As a developer on the ChatNova team, I want the `/flow` documentation to reflect
the current contact-based messaging rules and the corrected signup OTP flow, so that I can
understand the system without reading source code.

#### Acceptance Criteria

1. THE flow directory SHALL contain a `CONTACT_BASED_MESSAGING_FLOW.md` file that documents
   the contact-check logic for DMs, group creation, and group member addition, including the
   API endpoints affected and the error responses returned.

2. THE `OTP_FEATURES_FLOW.md` file SHALL be updated to accurately describe the signup OTP flow,
   including the step where `isVerified` is set to `false` on registration and the OTP email
   is sent before the JWT is issued.

3. THE `GROUP_CHAT_FLOW.md` file SHALL be updated to note that the member picker in
   `CreateGroupModal` shows only contacts and that the backend enforces a contact check on
   group creation and member addition.

4. THE updated flow documents SHALL include the relevant API endpoints, request/response shapes,
   error codes, and a step-by-step narrative for each affected flow.
