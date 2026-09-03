import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Group from "../models/Group.js";
import pool from "../lib/pg.js";

// ── Helper functions (extracted for reusability) ──────────────────────────────

async function getFriendsData(userId) {
    try {
        const requests = await FriendRequest.find({
            status: "accepted",
            $or: [{ sender: userId }, { receiver: userId }],
        })
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic");

        const valid = [];
        const staleIds = [];

        for (const r of requests) {
            const other = r.sender._id.toString() === userId.toString() ? r.receiver : r.sender;
            if (!other || !other._id) {
                staleIds.push(r._id);
            } else {
                valid.push(other);
            }
        }

        if (staleIds.length > 0) {
            FriendRequest.deleteMany({ _id: { $in: staleIds } }).catch((err) =>
                console.error("getFriendsData: stale request cleanup failed:", err.message)
            );
        }

        return valid;
    } catch (err) {
        console.error("getFriendsData error:", err);
        return [];
    }
}

async function getPendingRequestsData(userId) {
    try {
        return await FriendRequest.find({
            receiver: userId,
            status: "pending",
        }).populate("sender", "username profilePic email");
    } catch (err) {
        console.error("getPendingRequestsData error:", err);
        return [];
    }
}

async function getSentRequestsData(userId) {
    try {
        return await FriendRequest.find({
            sender: userId,
            status: "pending",
        }).populate("receiver", "username profilePic email");
    } catch (err) {
        console.error("getSentRequestsData error:", err);
        return [];
    }
}

async function getChatPartnersData(userId) {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT
               CASE
                 WHEN sender_id = $1 THEN receiver_id
                 ELSE sender_id
               END AS partner_id
             FROM dm_messages
             WHERE receiver_id IS NOT NULL
               AND group_id IS NULL
               AND (sender_id = $1 OR receiver_id = $1)`,
            [userId.toString()]
        );

        const partnerIds = rows.map((r) => r.partner_id);
        if (partnerIds.length === 0) return [];

        return await User.find({ _id: { $in: partnerIds } }).select("-password");
    } catch (err) {
        console.error("getChatPartnersData error:", err);
        return [];
    }
}

async function getMyGroupsData(userId) {
    try {
        return await Group.find({ members: userId })
            .populate("members", "-password")
            .populate("admin", "-password")
            .sort({ updatedAt: -1 });
    } catch (err) {
        console.error("getMyGroupsData error:", err);
        return [];
    }
}

// ── Main Dashboard Endpoint ───────────────────────────────────────────────────

/**
 * GET /api/dashboard
 * Returns all essential data in a single request:
 * - friends: accepted friend connections
 * - pending: incoming friend requests
 * - sent: outgoing friend requests
 * - chatPartners: users with active DM history
 * - groups: groups the user is a member of
 */
export const getDashboard = async (req, res) => {
    try {
        console.log('Dashboard request received for user:', req.user?._id);
        const userId = req.user._id;

        // Execute all queries in parallel for maximum performance
        const [friends, pending, sent, chatPartners, groups] = await Promise.all([
            getFriendsData(userId),
            getPendingRequestsData(userId),
            getSentRequestsData(userId),
            getChatPartnersData(userId),
            getMyGroupsData(userId),
        ]);

        console.log('Dashboard data fetched successfully:', {
            friendsCount: friends.length,
            pendingCount: pending.length,
            sentCount: sent.length,
            chatPartnersCount: chatPartners.length,
            groupsCount: groups.length
        });

        res.status(200).json({
            friends,
            pending,
            sent,
            chatPartners,
            groups,
        });
    } catch (err) {
        console.error("getDashboard error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

// ── Export helper functions for use in other controllers ──────────────────────
export {
    getFriendsData,
    getPendingRequestsData,
    getSentRequestsData,
    getChatPartnersData,
    getMyGroupsData,
};
