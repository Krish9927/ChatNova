/*
 * CHANGED: message.controller.js
 * Date: 2025
 * Changes:
 *  - Added import for io and getReceiverSocketId from socket.js
 *  - Fixed emit event name: "receiveMessage" → "newMessage" to match frontend listener
 *  - Added sender socket emit so sender's other tabs/devices update in real-time
 */
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import streamifier from "streamifier";





export const getAllContacts = async (req, res) => {
  try {
    const loggedUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  }
  catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, receiverId: receiverFromBody } = req.body;
    const receiverId = req.params.id || receiverFromBody;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({
        message:
          "Receiver id is required. Use POST /api/messages/send/:receiverId or send receiverId in the body.",
      });
    }

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.equals(receiverId)) {
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

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // also emit to sender so their other open tabs/devices update
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // only DM messages (receiverId is set, groupId is null)
    const messages = await Message.find({
      groupId: null,
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages
          .filter((msg) => msg.receiverId != null) // guard: skip any null receiverId
          .map((msg) =>
            msg.senderId.toString() === loggedInUserId.toString()
              ? msg.receiverId.toString()
              : msg.senderId.toString()
          )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Stream-upload audio blob to Cloudinary, save message, emit via socket
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
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver id is required." });
    }
    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    const result = await streamUploadToCloudinary(req.file.buffer);

    const newMessage = new Message({
      senderId,
      receiverId,
      audio: result.secure_url,
    });
    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", newMessage);

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendAudioMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
