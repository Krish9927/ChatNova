import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import { pubClient, subClient, redisClient } from "./redis.js";
import pool from "./pg.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ENV.CLIENT_URL],
    credentials: true,
  },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// ------------------------------------------------------------------
// PRESENCE HELPERS (Redis-backed, replaces in-memory userSocketMap)
// ------------------------------------------------------------------

// Key pattern: user:online:<userId>  →  value: socketId  (TTL: 35s)
const PRESENCE_TTL = 35; // seconds — auto-expires if disconnect event never fires

export const setUserOnline = async (userId, socketId) => {
  try {
    // EX sets the key to expire after PRESENCE_TTL seconds
    await redisClient.set(`user:online:${userId}`, socketId, { EX: PRESENCE_TTL });
  } catch (err) {
    console.error("[redis] setUserOnline error:", err);
  }
};

export const setUserOffline = async (userId) => {
  try {
    await redisClient.del(`user:online:${userId}`);
  } catch (err) {
    console.error("[redis] setUserOffline error:", err);
  }
};

export const getOnlineUserIds = async () => {
  try {
    // Scan all keys matching pattern user:online:*
    const keys = await redisClient.keys("user:online:*");
    // Extract the userId from each key: "user:online:abc123" → "abc123"
    return keys.map((key) => key.replace("user:online:", ""));
  } catch (err) {
    console.error("[redis] getOnlineUserIds error:", err);
    return [];
  }
};

// getReceiverSocketId is kept for backward compatibility with existing DM code
export const getReceiverSocketId = async (userId) => {
  try {
    return await redisClient.get(`user:online:${userId}`);
  } catch (err) {
    console.error("[redis] getReceiverSocketId error:", err);
    return null;
  }
};

// ------------------------------------------------------------------
// ATTACH REDIS ADAPTER (enables multi-server Socket.io scaling)
// Called after Redis clients connect in server.js
// ------------------------------------------------------------------
export const attachRedisAdapter = () => {
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[socket] Redis adapter attached — multi-server scaling active.");
};

// ------------------------------------------------------------------
// CONNECTION HANDLER
// ------------------------------------------------------------------
io.on("connection", async (socket) => {
  console.log("A user connected:", socket.user.username);

  const userId = socket.userId;

  // Mark user online in Redis with TTL
  await setUserOnline(userId, socket.id);

  // Broadcast updated online list (presence_update) to ALL connected clients across all servers
  const broadcastPresence = async () => {
    const onlineIds = await getOnlineUserIds();
    io.emit("getOnlineUsers", onlineIds);
    io.emit("presence_update", onlineIds);
  };
  await broadcastPresence();

  // Refresh TTL every 25 seconds (heartbeat) so active users never expire
  const heartbeat = setInterval(async () => {
    await setUserOnline(userId, socket.id);
  }, 25000);

  // --- Room Events ---
  socket.on("join_room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`[room] User ${socket.user.username} joined room: ${roomId}`);
    // Notify other room members
    socket.to(roomId).emit("user_joined", {
      userId: socket.userId,
      username: socket.user.username,
    });
  });

  socket.on("leave_room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    console.log(`[room] User ${socket.user.username} left room: ${roomId}`);
    // Notify other room members
    socket.to(roomId).emit("user_left", {
      userId: socket.userId,
      username: socket.user.username,
    });
  });

  socket.on("send_message", async (data) => {
    const { roomId, content } = data;
    if (!roomId || !content) return;

    try {
      // Save message to PostgreSQL
      const queryText = `
        INSERT INTO messages (room_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, room_id, sender_id, content, created_at
      `;
      const values = [roomId, socket.userId, content];
      const { rows } = await pool.query(queryText, values);
      const savedMessage = rows[0];

      // Emit new_message to all clients in the room (including sender)
      io.to(roomId).emit("new_message", savedMessage);
    } catch (error) {
      console.error("[postgres] Error saving message:", error);
    }
  });

  // --- Typing indicators ---
  socket.on("typing_start", (roomId) => {
    if (!roomId) return;
    socket.to(roomId).emit("typing_start", {
      userId: socket.userId,
      username: socket.user.username,
    });
  });

  socket.on("typing_stop", (roomId) => {
    if (!roomId) return;
    socket.to(roomId).emit("typing_stop", {
      userId: socket.userId,
      username: socket.user.username,
    });
  });

  // --- Disconnect handler ---
  socket.on("disconnect", async () => {
    console.log("A user disconnected:", socket.user.username);
    clearInterval(heartbeat);
    await setUserOffline(userId);
    await broadcastPresence();
  });
});

export { io, app, server };