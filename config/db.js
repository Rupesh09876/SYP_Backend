// config/db.js
const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // From Supabase
  ssl: { rejectUnauthorized: false }, // Important for Supabase
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 10000, // Close idle clients after 10s (prevents stale connections to Supabase)
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
});

// CRITICAL: Handle pool-level errors to prevent Node.js from crashing
// when Supabase drops idle connections (EADDRNOTAVAIL, ECONNRESET, etc.)
pool.on('error', (err, client) => {
  console.error('[DB Pool] Idle client error - connection was dropped by Supabase:', err.message);
  // Do NOT rethrow - this prevents the server from crashing
});

const db = drizzle(pool);

module.exports = { db };
