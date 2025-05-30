// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js'; // Make sure this path is correct if db.js is elsewhere

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  // FUTURE: Consider restricting origin for production if needed
  // origin: ['https://debspawsome.com', 'http://localhost:5173'] 
}));
app.use(express.json()); // To parse JSON request bodies

// Root route
app.get('/', (req, res) => {
  res.json({ message: "Debbie's Awesome Pawsome backend is running at the moment!" });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Services route - NOW FETCHES FROM DATABASE
app.get('/api/services', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, price_string, description, category FROM services ORDER BY category, id'
    );
    // The structure { services: result.rows } matches what your frontend expects
    res.json({ services: result.rows }); 
  } catch (err) {
    console.error('Error fetching services from DB:', err.stack);
    res.status(500).json({ error: 'Failed to fetch services from database.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server (backend) is currently running on port ${PORT}`);
  // The "DB: PostgreSQL connected successfully..." message from db.js should also appear here
  // shortly after startup if the import of db.js triggers its connection test.
});
