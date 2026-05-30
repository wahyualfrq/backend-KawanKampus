const { Pool } = require('pg');
require('dotenv').config();

// Extract clean connection string by removing Prisma-specific query params (like pgbouncer) if present
const rawDbUrl = process.env.DATABASE_URL || '';
const cleanDbUrl = rawDbUrl.split('?')[0];

const pool = new Pool({
  connectionString: cleanDbUrl,
  // Configure pool settings for serverless / production readiness
  max: 10, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection cannot be established
  ssl: {
    rejectUnauthorized: false // Required for Supabase / Hosted PostgreSQL
  }
});

// Test connection on startup (only for local development/non-serverless logs)
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
