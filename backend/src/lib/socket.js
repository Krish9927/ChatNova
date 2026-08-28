import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import { pubClient, subClient, redisClient } from "./redis.js";

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

  // Broadcast updated online list to ALL connected clients across all servers
  const onlineIds = await getOnlineUserIds();
  io.emit("getOnlineUsers", onlineIds);

  // Refresh TTL every 25 seconds (heartbeat) so active users never expire
  const heartbeat = setInterval(async () => {
    await setUserOnline(userId, socket.id);
  }, 25000);

  socket.on("disconnect", async () => {
    console.log("A user disconnected:", socket.user.username);
    clearInterval(heartbeat);
    await setUserOffline(userId);
    const updatedIds = await getOnlineUserIds();
    io.emit("getOnlineUsers", updatedIds);
  });
});

export { io, app, server };