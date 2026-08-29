import pool from "../lib/pg.js";

/**
 * GET /api/rooms/:id/messages?before=<cursor>
 * Returns up to 20 messages for the specified room created before the cursor timestamp
 */
export const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { before } = req.query; // Cursor is an ISO timestamp string or null
    const limit = 20;

    let queryText;
    let queryParams;

    if (before) {
      // Query messages created before the cursor timestamp (ordered descending)
      queryText = `
        SELECT id, room_id, sender_id, content, created_at
        FROM messages
        WHERE room_id = $1 AND created_at < $2
        ORDER BY created_at DESC
        LIMIT $3
      `;
      queryParams = [roomId, before, limit];
    } else {
      // First page: Query the latest messages
      queryText = `
        SELECT id, room_id, sender_id, content, created_at
        FROM messages
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      queryParams = [roomId, limit];
    }

    const { rows } = await pool.query(queryText, queryParams);

    // Return the messages. The client can use the 'created_at' of the oldest message (last element)
    // as the cursor 'before' for the next scroll request.
    const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;

    res.status(200).json({
      messages: rows.reverse(), // Reverse to make it ascending (oldest to newest) for UI rendering
      nextCursor,
    });
  } catch (error) {
    console.error("Error in getRoomMessages controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
