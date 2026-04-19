import Group from "../models/Group.js";
import Message from "../models/Message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// ── Create group ─────────────────────────────────────────────────────────────
export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds } = req.body;
        const adminId = req.user._id;

        if (!name?.trim()) return res.status(400).json({ message: "Group name is required" });

        // always include admin in members
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

        // notify all members via socket
        uniqueMembers.forEach((memberId) => {
            const socketId = getReceiverSocketId(memberId);
            if (socketId) io.to(socketId).emit("groupCreated", populated);
        });

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

        // notify all members
        group.members.forEach((memberId) => {
            const socketId = getReceiverSocketId(memberId.toString());
            if (socketId) io.to(socketId).emit("groupUpdated", populated);
        });

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

        group.members.forEach((memberId) => {
            const socketId = getReceiverSocketId(memberId.toString());
            if (socketId) io.to(socketId).emit("groupUpdated", populated);
        });

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

        // if admin leaves, assign new admin
        if (isAdmin && isSelf && group.members.length > 0) {
            group.admin = group.members[0];
        }

        await group.save();

        const populated = await Group.findById(group._id)
            .populate("members", "-password")
            .populate("admin", "-password");

        // notify removed member
        const removedSocket = getReceiverSocketId(memberId);
        if (removedSocket) io.to(removedSocket).emit("removedFromGroup", { groupId: group._id });

        // notify remaining members
        group.members.forEach((m) => {
            const socketId = getReceiverSocketId(m.toString());
            if (socketId) io.to(socketId).emit("groupUpdated", populated);
        });

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

        // notify all members before deleting
        group.members.forEach((memberId) => {
            const socketId = getReceiverSocketId(memberId.toString());
            if (socketId) io.to(socketId).emit("groupDeleted", { groupId: group._id });
        });

        await Message.deleteMany({ groupId: group._id });
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

        const messages = await Message.find({ groupId: req.params.id })
            .populate("senderId", "username profilePic")
            .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Send group message ────────────────────────────────────────────────────────
export const sendGroupMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const groupId = req.params.id;
        const senderId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m.toString() === senderId.toString());
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        if (!text && !image) return res.status(400).json({ message: "Text or image required" });

        let imageUrl;
        if (image) {
            const upload = await cloudinary.uploader.upload(image);
            imageUrl = upload.secure_url;
        }

        const newMessage = new Message({ senderId, groupId, text, image: imageUrl });
        await newMessage.save();

        const populated = await Message.findById(newMessage._id)
            .populate("senderId", "username profilePic");

        // emit only to OTHER members — sender already has it via REST response
        group.members.forEach((memberId) => {
            if (memberId.toString() === senderId.toString()) return;
            const socketId = getReceiverSocketId(memberId.toString());
            if (socketId) io.to(socketId).emit("newGroupMessage", populated);
        });

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
        const senderId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const isMember = group.members.some((m) => m.toString() === senderId.toString());
        if (!isMember) return res.status(403).json({ message: "Not a member" });

        const { default: streamifier } = await import("streamifier");
        const audioUrl = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: "video", folder: "chat_audio" },
                (err, result) => err ? reject(err) : resolve(result.secure_url)
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        const newMessage = new Message({ senderId, groupId, audio: audioUrl });
        await newMessage.save();

        const populated = await Message.findById(newMessage._id)
            .populate("senderId", "username profilePic");

        // emit only to OTHER members — sender already has it via REST response
        group.members.forEach((memberId) => {
            if (memberId.toString() === senderId.toString()) return;
            const socketId = getReceiverSocketId(memberId.toString());
            if (socketId) io.to(socketId).emit("newGroupMessage", populated);
        });

        res.status(201).json(populated);
    } catch (err) {
        console.error("sendGroupAudioMessage error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
