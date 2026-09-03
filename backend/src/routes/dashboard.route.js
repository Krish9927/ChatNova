import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import arcjetProtection from "../middleware/arcjet.middleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = express.Router();

// Apply middleware to all routes
router.use(arcjetProtection, protectedRoute);

// GET /api/dashboard - Single endpoint to fetch all home screen data
router.get("/", getDashboard);

export default router;
