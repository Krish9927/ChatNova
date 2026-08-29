import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { getRoomMessages } from "../controllers/room.controller.js";

const router = express.Router();

// GET room history with cursor pagination
router.get("/:id/messages", protectedRoute, getRoomMessages);

export default router;
