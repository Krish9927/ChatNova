/*
 * CHANGED: group.controller.js
 * - Migrated group message storage from MongoDB → PostgreSQL (dm_messages table)
 * - Fixed all getReceiverSocketId() calls — now properly awaited (was returning Promise)
 * - Group metadata (Group model) stays in MongoDB — document storage is correct for that
 */
import Group from "../models/Group.js";
import pool from "../lib/pg.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// Map PostgreSQL row → frontend-expected shape
// Mimics the old Mongoose populated shape so no frontend changes needed
function rowToGroupMessage(row, senderUser = null) {
    return {
        _id: row.id,
        senderId: senderUser || { _id: row.sender_id },
        groupId: row.group_id,
        text: row.text,
        image: row.image,
        audio: row.audio,
        sticker: row.sticker,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ── Create group ──────────────────────────────────────────────────────────────
export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds } = req.body;
        const adminId = req.user._id;

        if (!name?.trim()) return res.status(400).json({ message: "Group name is required" });

        const uniqueMembers = [...new Set([adminId.toString(), ...(memberIds || [])])];

        const group = new Group({
            name: name.trim(),
            description: description?.trim() || "",
            admin: adminId,
            members: uniqueMembers,
        });
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("members", "-password")
            .populate("admin", "-password");

        // notify all members via socket (await the async Redis lookup)
        await Promise.all(
            uniqueMembers.map(async (memberId) => {
                const socketId = await getReceiverSocketId(memberId);
                if (socketId) io.to(socketId).emit("groupCreated", populated);
            })
        );

        res.status(201).json(populated);
    } catch (err) {
        console.error("createGroup error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get my groups ─────────────────────────────────────────────────────────────
export const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate("members", "-password")
            .populate("admin", "-password")
            .sort({ updatedAt: -1 });
        res.status(200).json(groups);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get single group ──────────────────────────────────────────────────────────
export const getGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate("members", "-password")
            .populate("admin", "-password");
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        res.status(200).json(group);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Update group (admin only) ─────────────────────────────────────────────────
export const updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (group.admin.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Only admin can update group" });

        const { name, description, avatar } = req.body;
        if (name) group.name = name.trim();
        if (description !== undefined) group.description = description.trim();
        if (avatar) {
            const upload = await cloudinary.uploader.upload(avatar);
            group.avatar = upload.secure_url;
        }
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("members", "-password")
            .populate("admin", "-password");

        await Promise.all(
            group.members.map(async (memberId) => {
                const socketId = await getReceiverSocketId(memberId.toString());
                if (socketId) io.to(socketId).emit("groupUpdated", populated);
            })
        );

        res.status(200).json(populated);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Add members (admin only) ──────────────────────────────────────────────────
export const addMembers = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (group.admin.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Only admin can add members" });

        const { memberIds } = req.body;
        if (!memberIds?.length) return res.status(400).json({ message: "memberIds required" });

        const newMembers = memberIds.filter(
            (id) => !group.members.map((m) => m.toString()).includes(id)
        );
        group.members.push(...newMembers);
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("members", "-password")
            .populate("admin", "-password");

        await Promise.all(
            group.members.map(async (memberId) => {
                const socketId = await getReceiverSocketId(memberId.toString());
                if (socketId) io.to(socketId).emit("groupUpdated", populated);
            })
        );

        res.status(200).json(populated);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Remove member (admin only, or self-leave) ─────────────────────────────────
export const removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const { memberId } = req.body;
        const isAdmin = group.admin.toString() === req.user._id.toString();
        const isSelf = memberId === req.user._id.toString();

        if (!isAdmin && !isSelf)
            return res.status(403).json({ message: "Not allowed" });

        group.members = group.members.filter((m) => m.toString() !== memberId);

        if (isAdmin && isSelf && group.members.length > 0) {
            group.admin = group.members[0];
        }
        await group.save();

        const populated = await Group.findById(group._id)
            .populate("members", "-password")
            .populate("admin", "-password");

        const [removedSocket] = await Promise.all([getReceiverSocketId(memberId)]);
        if (removedSocket) io.to(removedSocket).emit("removedFromGroup", { groupId: group._id });

        await Promise.all(
            group.members.map(async (m) => {
                const socketId = await getReceiverSocketId(m.toString());
                if (socketId) io.to(socketId).emit("groupUpdated", populated);
            })
        );

        res.status(200).json(populated);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Delete group (admin only) ─────────────────────────────────────────────────
export const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });
        if (group.admin.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Only admin can delete group" });

        await Promise.all(
            group.members.map(async (memberId) => {
                const socketId = await getReceiverSocketId(memberId.toString());
                if (socketId) io.to(socketId).emit("groupDeleted", { groupId: group._id });
            })
        );

        // delete group messages from PostgreSQL
        await pool.query(`DELETE FROM dm_messages WHERE group_id = $1`, [group._id.toString()]);
        await Group.findByIdAndDelete(group._id);

        res.status(200).json({ message: "Group deleted" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get group messages ────────────────────────────────────────────────────────
export const getGroupMessages = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        const { rows } = await pool.query(
            `SELECT * FROM dm_messages WHERE group_id = $1 ORDER BY created_at ASC`,
            [req.params.id]
        );

        // Fetch sender profiles from MongoDB for the populated shape
        const User = (await import("../models/User.js")).default;
        const senderIds = [...new Set(rows.map((r) => r.sender_id))];
        const senders = await User.find({ _id: { $in: senderIds } }).select("username profilePic");
        const senderMap = Object.fromEntries(senders.map((s) => [s._id.toString(), s]));

        res.status(200).json(rows.map((r) => rowToGroupMessage(r, senderMap[r.sender_id])));
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Send group message ────────────────────────────────────────────────────────
export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image, sticker } = req.body;
        const groupId = req.params.id;
        const senderId = req.user._id.toString();

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m.toString() === senderId);
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        if (!text && !image && !sticker)
            return res.status(400).json({ message: "Text, image, or sticker required" });

        let imageUrl;
        if (image) {
            const upload = await cloudinary.uploader.upload(image);
            imageUrl = upload.secure_url;
        }

        const { rows } = await pool.query(
            `INSERT INTO dm_messages (sender_id, group_id, text, image, sticker)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [senderId, groupId, text || null, imageUrl || null, sticker || null]
        );

        // Fetch sender profile for populated shape
        const User = (await import("../models/User.js")).default;
        const sender = await User.findById(senderId).select("username profilePic");
        const populated = rowToGroupMessage(rows[0], sender);

        // emit to all OTHER members
        await Promise.all(
            group.members
                .filter((m) => m.toString() !== senderId)
                .map(async (memberId) => {
                    const socketId = await getReceiverSocketId(memberId.toString());
                    if (socketId) io.to(socketId).emit("newGroupMessage", populated);
                })
        );

        res.status(201).json(populated);
    } catch (err) {
        console.error("sendGroupMessage error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Send group audio message ──────────────────────────────────────────────────
export const sendGroupAudioMessage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Audio file required" });

        const groupId = req.params.id;
        const senderId = req.user._id.toString();

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m.toString() === senderId);
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        const { default: streamifier } = await import("streamifier");
        const audioUrl = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: "video", folder: "chat_audio" },
                (err, result) => err ? reject(err) : resolve(result.secure_url)
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        const { rows } = await pool.query(
            `INSERT INTO dm_messages (sender_id, group_id, audio)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [senderId, groupId, audioUrl]
        );

        const User = (await import("../models/User.js")).default;
        const sender = await User.findById(senderId).select("username profilePic");
        const populated = rowToGroupMessage(rows[0], sender);

        await Promise.all(
            group.members
                .filter((m) => m.toString() !== senderId)
                .map(async (memberId) => {
                    const socketId = await getReceiverSocketId(memberId.toString());
                    if (socketId) io.to(socketId).emit("newGroupMessage", populated);
                })
        );

        res.status(201).json(populated);
    } catch (err) {
        console.error("sendGroupAudioMessage error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
