import express from "express";
import { translateMessage } from "../controllers/translate.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/translate
// Protected so only logged-in users can use it
router.post("/", protectedRoute, translateMessage);

export default router;
