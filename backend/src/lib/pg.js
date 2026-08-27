import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

const connectionString = ENV.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chatnova_db';

const pool = new Pool({
  connectionString,
  ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
