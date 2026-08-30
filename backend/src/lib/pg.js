import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

const connectionString = ENV.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chatnova_db';

// POSTGRES_SSL=false explicitly disables SSL (e.g. local Docker Postgres container)
// In production with a cloud DB (Neon, RDS, etc.), SSL is enabled automatically
const sslConfig = (() => {
  if (process.env.POSTGRES_SSL === 'false') return false;
  if (ENV.NODE_ENV === 'production') return { rejectUnauthorized: false };
  return false;
})();

const pool = new Pool({
  connectionString,
  ssl: sslConfig
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
