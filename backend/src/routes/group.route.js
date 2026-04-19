import express from "express";
import multer from "multer";
import { protectedRoute } from "../middleware/auth.middleware.js";
import arcjetProtection from "../middleware/arcjet.middleware.js";
import {
    createGroup, getMyGroups, getGroup, updateGroup,
    addMembers, removeMember, deleteGroup,
    getGroupMessages, sendGroupMessage, sendGroupAudioMessage,
} from "../controllers/group.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(arcjetProtection, protectedRoute);

// Group CRUD
router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:id", getGroup);
router.put("/:id", updateGroup);
router.delete("/:id", deleteGroup);

// Members
router.post("/:id/members", addMembers);
router.delete("/:id/members", removeMember);

// Messages
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);
router.post("/:id/messages/audio", upload.single("audio"), sendGroupAudioMessage);

export default router;
