import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import arcjetProtection from "../middleware/arcjet.middleware.js";
import {
    searchUsers, getFriends, getPendingRequests, getSentRequests,
    sendRequest, respondToRequest,
} from "../controllers/friend.controller.js";

const router = express.Router();
router.use(arcjetProtection, protectedRoute);

router.get("/search", searchUsers);          // GET /api/friends/search?q=...
router.get("/", getFriends);                 // GET /api/friends
router.get("/pending", getPendingRequests);  // GET /api/friends/pending
router.get("/sent", getSentRequests);        // GET /api/friends/sent
router.post("/request", sendRequest);        // POST /api/friends/request
router.put("/request/:requestId", respondToRequest); // PUT /api/friends/request/:id

export default router;
