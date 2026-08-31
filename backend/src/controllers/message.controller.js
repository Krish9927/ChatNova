/*
 * CHANGED: message.controller.js
 * Migrated DM message storage from MongoDB → PostgreSQL (dm_messages table)
 * MongoDB Message model is no longer written to.
 * All reads/writes now go through the shared pg pool.
 */
import pool from "../lib/pg.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import streamifier from "streamifier";
import { sendMessageEmailIfNeeded } from "../lib/notificationHelper.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

// Map a PostgreSQL row to the shape the frontend expects
// (matches the old Mongoose document shape so no frontend changes needed)
function rowToMessage(row) {
  return {
    _id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    groupId: row.group_id,
    text: row.text,
    image: row.image,
    audio: row.audio,
    sticker: row.sticker,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const getAllContacts = async (req, res) => {
  try {
    const loggedUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id.toString();
    const otherId = req.params.id;

    const { rows } = await pool.query(
      `SELECT * FROM dm_messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [myId, otherId]
    );

    res.status(200).json(rows.map(rowToMessage));
  } catch (error) {
    console.error("Error in getMessagesByUserId:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, sticker, receiverId: receiverFromBody } = req.body;
    const receiverId = req.params.id || receiverFromBody;
    const senderId = req.user._id.toString();

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver id is required." });
    }
    if (!text && !image && !sticker) {
      return res.status(400).json({ message: "Text, image, or sticker is required." });
    }
    if (senderId === receiverId.toString()) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const { rows } = await pool.query(
      `INSERT INTO dm_messages (sender_id, receiver_id, text, image, sticker)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, receiverId, text || null, imageUrl || null, sticker || null]
    );

    const newMessage = rowToMessage(rows[0]);

    const [receiverSocketId, senderSocketId] = await Promise.all([
      getReceiverSocketId(receiverId),
      getReceiverSocketId(senderId),
    ]);

    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);

    // Fire-and-forget: email notification for offline receiver
    sendMessageEmailIfNeeded(receiverId, senderId, text || "📷 Image").catch(() => {});

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id.toString();

    // Get all distinct users this person has DMed or received DMs from
    const { rows } = await pool.query(
      `SELECT DISTINCT
         CASE
           WHEN sender_id = $1 THEN receiver_id
           ELSE sender_id
         END AS partner_id
       FROM dm_messages
       WHERE receiver_id IS NOT NULL
         AND group_id IS NULL
         AND (sender_id = $1 OR receiver_id = $1)`,
      [loggedInUserId]
    );

    const partnerIds = rows.map((r) => r.partner_id);
    const chatPartners = await User.find({ _id: { $in: partnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Audio messages ────────────────────────────────────────────────────────────

function streamUploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "video", folder: "chat_audio", public_id: `audio_${Date.now()}` },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

export const sendAudioMessage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Audio file is required." });
    }

    const receiverId = req.params.id || req.body.receiverId;
    const senderId = req.user._id.toString();

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver id is required." });
    }
    if (senderId === receiverId.toString()) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    const result = await streamUploadToCloudinary(req.file.buffer);

    const { rows } = await pool.query(
      `INSERT INTO dm_messages (sender_id, receiver_id, audio)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, result.secure_url]
    );

    const newMessage = rowToMessage(rows[0]);

    const [receiverSocketId, senderSocketId] = await Promise.all([
      getReceiverSocketId(receiverId),
      getReceiverSocketId(senderId),
    ]);

    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);

    // Fire-and-forget: email notification for offline receiver
    sendMessageEmailIfNeeded(receiverId, senderId, "🎵 Audio message").catch(() => {});

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendAudioMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
