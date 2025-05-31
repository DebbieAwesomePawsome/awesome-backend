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

// POST /api/services - Create a new service
// Ensure this is placed before app.listen()
// You should already have `app.use(express.json());` middleware defined near the top of your file
// to parse JSON request bodies.

app.post('/api/services', async (req, res) => {
  const { name, price_string, description, category } = req.body;

  // Basic validation: Ensure 'name' is provided
  if (!name) {
    return res.status(400).json({ error: 'Service name is required.' });
  }
  // You could add more validation here for other fields if needed

  try {
    const newService = await db.query(
      `INSERT INTO services (name, price_string, description, category) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`, // RETURNING * will return the newly created row
      [name, price_string || null, description || null, category || 'Regular'] // Use null for optional fields if they are empty or not provided
    );

    res.status(201).json({ 
      message: 'Service created successfully', 
      service: newService.rows[0] // The new service record from the DB
    });
  } catch (err) {
    console.error('Error creating service in DB:', err.stack);
    res.status(500).json({ error: 'Failed to create service in database.' });
  }
});

// PUT /api/services/:id - Update an existing service
// Ensure this is placed before app.listen()

app.put('/api/services/:id', async (req, res) => {
  const serviceId = parseInt(req.params.id, 10);
  const { name, price_string, description, category } = req.body;

  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'Invalid service ID format.' });
  }

  // Collect fields to update
  const fieldsToUpdate = [];
  const values = [];
  let queryParamIndex = 1;

  if (name !== undefined) {
    if (name.trim() === '') return res.status(400).json({ error: 'Service name cannot be empty.'});
    fieldsToUpdate.push(`name = $${queryParamIndex++}`);
    values.push(name);
  }
  if (price_string !== undefined) {
    fieldsToUpdate.push(`price_string = $${queryParamIndex++}`);
    values.push(price_string);
  }
  if (description !== undefined) {
    fieldsToUpdate.push(`description = $${queryParamIndex++}`);
    values.push(description);
  }
  if (category !== undefined) {
    fieldsToUpdate.push(`category = $${queryParamIndex++}`);
    values.push(category);
  }

  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update. At least one field (name, price_string, description, or category) must be supplied.' });
  }

  // The database trigger will automatically update `updated_at`
  // No need to add `updated_at = NOW()` here unless you want explicit application-level timestamping

  values.push(serviceId); // Add the serviceId as the last parameter for the WHERE clause

  const setClause = fieldsToUpdate.join(', ');
  const updateQuery = `UPDATE services SET ${setClause} WHERE id = $${queryParamIndex} RETURNING *`;

  try {
    const updatedService = await db.query(updateQuery, values);

    if (updatedService.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found with the provided ID.' });
    }

    res.json({
      message: 'Service updated successfully',
      service: updatedService.rows[0]
    });
  } catch (err) {
    console.error(`Error updating service ID ${serviceId} in DB:`, err.stack);
    res.status(500).json({ error: 'Failed to update service in database.' });
  }
});

// DELETE /api/services/:id - Delete a service
// Ensure this is placed before app.listen()

app.delete('/api/services/:id', async (req, res) => {
  const serviceId = parseInt(req.params.id, 10);

  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'Invalid service ID format.' });
  }

  try {
    // RETURNING * will return the row that was deleted.
    // If no row is deleted (e.g., ID not found), rows will be an empty array.
    const deleteOp = await db.query('DELETE FROM services WHERE id = $1 RETURNING *', [serviceId]);

    if (deleteOp.rowCount === 0) { // Or check deleteOp.rows.length === 0
      return res.status(404).json({ error: 'Service not found with the provided ID.' });
    }

    res.json({ 
      message: 'Service deleted successfully', 
      service: deleteOp.rows[0] // The service that was deleted
    });
    // Alternatively, for DELETE operations, some APIs prefer to return a 204 No Content status
    // if successful and no body is needed in the response:
    // res.status(204).send();

  } catch (err) {
    console.error(`Error deleting service ID ${serviceId} from DB:`, err.stack);
    res.status(500).json({ error: 'Failed to delete service from database.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server (backend) is currently running on port ${PORT}`);
  // The "DB: PostgreSQL connected successfully..." message from db.js should also appear here
  // shortly after startup if the import of db.js triggers its connection test.
});
