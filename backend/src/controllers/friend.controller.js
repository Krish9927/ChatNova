import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// ── Search users (exclude self + existing friends + pending) ─────────────────
export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q?.trim()) return res.status(200).json([]);

        const myId = req.user._id;

        // find accepted friends
        const accepted = await FriendRequest.find({
            status: "accepted",
            $or: [{ sender: myId }, { receiver: myId }],
        });
        const friendIds = accepted.map((r) =>
            r.sender.toString() === myId.toString() ? r.receiver : r.sender
        );

        // find pending/sent requests
        const pending = await FriendRequest.find({
            status: "pending",
            $or: [{ sender: myId }, { receiver: myId }],
        });
        const pendingIds = pending.flatMap((r) => [r.sender, r.receiver]);

        const excludeIds = [...new Set([myId, ...friendIds, ...pendingIds].map(String))];

        const users = await User.find({
            _id: { $nin: excludeIds },
            isVerified: true,
            $or: [
                { username: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
            ],
        })
            .select("username email profilePic")
            .limit(20);

        res.status(200).json(users);
    } catch (err) {
        console.error("searchUsers:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get accepted friends ─────────────────────────────────────────────────────
export const getFriends = async (req, res) => {
    try {
        const myId = req.user._id;
        const requests = await FriendRequest.find({
            status: "accepted",
            $or: [{ sender: myId }, { receiver: myId }],
        })
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic");

        const friends = requests.map((r) =>
            r.sender._id.toString() === myId.toString() ? r.receiver : r.sender
        );
        res.status(200).json(friends);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get pending incoming requests ────────────────────────────────────────────
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: "pending",
        }).populate("sender", "username profilePic email");
        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Get sent requests ────────────────────────────────────────────────────────
export const getSentRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({
            sender: req.user._id,
            status: "pending",
        }).populate("receiver", "username profilePic email");
        res.status(200).json(requests);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Send friend request ──────────────────────────────────────────────────────
export const sendRequest = async (req, res) => {
    try {
        const senderId = req.user._id;
        const { receiverId } = req.body;

        if (!receiverId) return res.status(400).json({ message: "receiverId required" });
        if (senderId.toString() === receiverId)
            return res.status(400).json({ message: "Cannot add yourself" });

        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) return res.status(404).json({ message: "User not found" });

        // check if already friends or request exists
        const existing = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId },
            ],
        });
        if (existing) {
            if (existing.status === "accepted")
                return res.status(400).json({ message: "Already friends" });
            if (existing.status === "pending")
                return res.status(400).json({ message: "Request already sent" });
        }

        const request = new FriendRequest({ sender: senderId, receiver: receiverId });
        await request.save();

        const populated = await FriendRequest.findById(request._id)
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic");

        // notify receiver via socket
        const receiverSocket = getReceiverSocketId(receiverId);
        if (receiverSocket) {
            io.to(receiverSocket).emit("friendRequest", populated);
        }

        res.status(201).json(populated);
    } catch (err) {
        if (err.code === 11000)
            return res.status(400).json({ message: "Request already sent" });
        console.error("sendRequest:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── Accept or reject request ─────────────────────────────────────────────────
export const respondToRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body; // "accept" | "reject"
        const myId = req.user._id;

        const request = await FriendRequest.findById(requestId)
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic");

        if (!request) return res.status(404).json({ message: "Request not found" });
        if (request.receiver._id.toString() !== myId.toString())
            return res.status(403).json({ message: "Not your request" });
        if (request.status !== "pending")
            return res.status(400).json({ message: "Request already handled" });

        if (action === "accept") {
            request.status = "accepted";
            await request.save();

            // notify sender
            const senderSocket = getReceiverSocketId(request.sender._id.toString());
            if (senderSocket) {
                io.to(senderSocket).emit("friendRequestAccepted", request);
            }

            return res.status(200).json(request);
        }

        if (action === "reject") {
            request.status = "rejected";
            await request.save();
            return res.status(200).json({ message: "Request rejected" });
        }

        res.status(400).json({ message: "Invalid action" });
    } catch (err) {
        console.error("respondToRequest:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
};
