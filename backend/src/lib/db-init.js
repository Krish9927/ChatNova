import pool from './pg.js';

export const initPostgresDB = async () => {
  try {
    console.log('[db] Initializing PostgreSQL database...');
    // test connection
    const res = await pool.query('SELECT NOW()');
    console.log('[db] PostgreSQL connection successful:', res.rows[0].now);

    // create messages table
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

    // create compound index for cursor pagination
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_created_at 
      ON messages(room_id, created_at DESC);
    `);
    console.log('[db] PostgreSQL compound index idx_messages_room_created_at verified.');
  } catch (error) {
    console.error('[db] Error initializing PostgreSQL database:', error);
    throw error;
  }
};
