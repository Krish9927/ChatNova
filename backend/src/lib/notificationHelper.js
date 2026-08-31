/**
 * notificationHelper.js
 * Core logic for email notifications on new messages / friend requests.
 *
 * Rules:
 *  1. Only notify if user has emailNotifications enabled
 *  2. Only notify if user is OFFLINE (no active socket connection)
 *  3. Respect a cooldown (max 1 email per user per 5 minutes) — tracked in Redis
 *  4. All sends are fire-and-forget — errors are logged but never block the API
 */
import User from "../models/User.js";
import { getReceiverSocketId } from "./socket.js";
import { redisClient } from "./redis.js";
import {
  sendNewMessageNotification,
  sendFriendRequestNotification,
} from "../emails/emailHandler.js";

const COOLDOWN_SECONDS = 300; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check whether the user should receive an email notification.
 * Returns the User document if yes, null otherwise.
 */
async function getNotifiableUser(userId) {
  // 1. Fetch user
  const user = await User.findById(userId).select("email username emailNotifications");
  if (!user) return null;

  // 2. Check opt-in
  if (user.emailNotifications === false) return null;

  // 3. Check if online (has an active socket)
  const socketId = await getReceiverSocketId(userId.toString());
  if (socketId) return null; // online → skip email

  // 4. Check cooldown
  const cooldownKey = `email:cooldown:${userId}`;
  const existing = await redisClient.get(cooldownKey);
  if (existing) return null; // recently emailed → skip

  return user;
}

/**
 * Set the cooldown flag in Redis so we don't email the same user too frequently.
 */
async function setCooldown(userId) {
  const cooldownKey = `email:cooldown:${userId}`;
  try {
    await redisClient.set(cooldownKey, "1", { EX: COOLDOWN_SECONDS });
  } catch (err) {
    console.error("[notify] Failed to set cooldown:", err.message);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an email notification for a new message (DM or group).
 * Fire-and-forget — never throws.
 *
 * @param {string} receiverId  — MongoDB _id of the recipient
 * @param {string} senderId    — MongoDB _id of the sender
 * @param {string} messagePreview — text content (or emoji like "🎵 Audio message")
 */
export async function sendMessageEmailIfNeeded(receiverId, senderId, messagePreview) {
  try {
    const receiver = await getNotifiableUser(receiverId);
    if (!receiver) return;

    // fetch sender name
    const sender = await User.findById(senderId).select("username");
    const senderName = sender?.username || "Someone";

    await sendNewMessageNotification(
      receiver.email,
      receiver.username,
      senderName,
      messagePreview || "📎 Attachment"
    );

    await setCooldown(receiverId);
    console.log(`[notify] Message email sent to ${receiver.email} (from ${senderName})`);
  } catch (err) {
    // Fire-and-forget — log but don't propagate
    console.error(`[notify] sendMessageEmailIfNeeded failed for user ${receiverId}:`, err.message);
  }
}

/**
 * Send an email notification for a new friend request.
 * Fire-and-forget — never throws.
 *
 * @param {string} receiverId — MongoDB _id of the recipient
 * @param {string} senderId   — MongoDB _id of the sender
 */
export async function sendFriendRequestEmailIfNeeded(receiverId, senderId) {
  try {
    const receiver = await getNotifiableUser(receiverId);
    if (!receiver) return;

    const sender = await User.findById(senderId).select("username");
    const senderName = sender?.username || "Someone";

    await sendFriendRequestNotification(
      receiver.email,
      receiver.username,
      senderName
    );

    await setCooldown(receiverId);
    console.log(`[notify] Friend request email sent to ${receiver.email} (from ${senderName})`);
  } catch (err) {
    console.error(`[notify] sendFriendRequestEmailIfNeeded failed for user ${receiverId}:`, err.message);
  }
}
