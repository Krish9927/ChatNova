import pool from './pg.js';

export const initPostgresDB = async () => {
  try {
    console.log('[db] Initializing PostgreSQL database...');
    // test connection
    const res = await pool.query('SELECT NOW()');
    console.log('[db] PostgreSQL connection successful:', res.rows[0].now);

    // ── Room messages table (used by /api/rooms + test client) ──────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        sender_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[db] PostgreSQL messages table verified.');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_created_at 
      ON messages(room_id, created_at DESC);
    `);
    console.log('[db] PostgreSQL compound index idx_messages_room_created_at verified.');

    // ── DM messages table (replaces MongoDB Message collection) ─────────────
    // sender_id / receiver_id / group_id are stored as TEXT (MongoDB ObjectId strings)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
        sender_id   TEXT         NOT NULL,
        receiver_id TEXT         DEFAULT NULL,
        group_id    TEXT         DEFAULT NULL,
        text        TEXT         DEFAULT NULL,
        image       TEXT         DEFAULT NULL,
        audio       TEXT         DEFAULT NULL,
        sticker     TEXT         DEFAULT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT  dm_has_target CHECK (receiver_id IS NOT NULL OR group_id IS NOT NULL)
      );
    `);
    console.log('[db] PostgreSQL dm_messages table verified.');

    // Index for fetching DM conversation between two users efficiently
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dm_sender_receiver
      ON dm_messages(sender_id, receiver_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dm_receiver_sender
      ON dm_messages(receiver_id, sender_id);
    `);
    // Index for group messages
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dm_group_id
      ON dm_messages(group_id, created_at ASC);
    `);
    console.log('[db] PostgreSQL dm_messages indexes verified.');

  } catch (error) {
    console.error('[db] Error initializing PostgreSQL database:', error);
    throw error;
  }
};
