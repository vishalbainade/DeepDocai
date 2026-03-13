import pg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL for Neon PostgreSQL (connection pooler)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('DB', 'Executed query', {
      text: text.substring(0, 80),
      duration,
      rows: res.rowCount,
    });
    return res;
  } catch (error) {
    logger.error('DB', 'Database query error', {
      error: error.message,
      text: text.substring(0, 80),
    });
    throw error;
  }
};

export const getClient = () => {
  return pool.connect();
};

export default pool;
