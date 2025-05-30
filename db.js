import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
});

// Optional: Test the connection when the application starts
// This will log to your backend server console when you run 'npm run dev'
pool.connect((err, client, release) => {
  if (err) {
    return console.error('DB: Error acquiring client for connection test', err.stack);
  }
  client.query('SELECT NOW() AS now', (err, result) => { // Added 'AS now' for clarity
    release(); // Release client back to the pool
    if (err) {
      return console.error('DB: Error executing query for connection test', err.stack);
    }
    if (result && result.rows && result.rows.length > 0) {
      console.log('DB: PostgreSQL connected successfully at', result.rows[0].now);
    } else {
      // This case should ideally not happen if the query is 'SELECT NOW()' and connection is good
      console.log('DB: PostgreSQL connected successfully (test query returned no rows).');
    }
  });
});

// Export a query function
export default {
  query: (text, params) => pool.query(text, params),
  // You could add a getClient function here if you need to manage transactions manually later
  // getClient: () => pool.connect(),
};
