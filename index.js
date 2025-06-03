// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js'; // Make sure this path is correct if db.js is elsewhere
import { verifyAdminCredentials, generateToken, authenticateAdmin } from './auth.js'; // <--- Authentication details
import { ServerClient as PostmarkClient } from 'postmark'; // <<< ADD THIS

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


// Admin login endpoint
app.post('/api/auth/admin/login', async (req, res) => {
  // The `async` keyword isn't strictly necessary here since bcrypt.compareSync is synchronous,
  // but it doesn't hurt and keeps consistency if you later add async operations.
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Verify credentials using the helper from auth.js
    // Remember your ADMIN_USERNAME in .env is 'debbie' (or whatever you set)
    if (verifyAdminCredentials(username, password)) {
      // Credentials are valid, generate a token
      const adminData = {
        username: username, // or process.env.ADMIN_USERNAME
        role: 'admin',
        loginTime: new Date().toISOString() // Optional: include login time in token
      };
      const token = generateToken(adminData);

      if (token) {
        res.json({
          message: 'Admin login successful!',
          token: token,
          user: { username: adminData.username, role: adminData.role }
        });
      } else {
        // This would happen if JWT_SECRET was missing, which auth.js logs
        res.status(500).json({ error: 'Could not generate token due to server configuration issue.' });
      }
    } else {
      // Invalid credentials
      res.status(401).json({ error: 'Invalid username or password.' });
    }
  } catch (error) {
    console.error('Admin login route error:', error);
    res.status(500).json({ error: 'Admin login failed due to an internal server error.' });
  }
});

// Services route - NOW FETCHES FROM DATABASE
// Services route - Fetches from database and orders by sort_order
app.get('/api/services', async (req, res) => {
  try {
    const result = await db.query(
      // Select the sort_order column and order by it, then by id as a fallback
      'SELECT id, name, price_string, description, category, sort_order FROM services ORDER BY sort_order ASC, id ASC'
    );
    // The structure { services: result.rows } matches what your frontend expects
    res.json({ services: result.rows });
  } catch (err) {
    console.error('Error fetching services from DB:', err.stack);
    res.status(500).json({ error: 'Failed to fetch services from database.' });
  }
});

// GET /api/services/:id - Fetch a single service by its ID
app.get('/api/services/:id', async (req, res) => {
  const serviceId = parseInt(req.params.id, 10);

  if (isNaN(serviceId)) {
    return res.status(400).json({ error: 'Invalid service ID format.' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, price_string, description, category FROM services WHERE id = $1',
      [serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ service: result.rows[0] }); // Send back the single service
  } catch (err) {
    console.error(`Error fetching service ID ${serviceId} from DB:`, err.stack);
    res.status(500).json({ error: 'Failed to fetch service from database.' });
  }
});

// POST /api/services - Create a new service
// Ensure this is placed before app.listen()
// You should already have `app.use(express.json());` middleware defined near the top of your file
// to parse JSON request bodies.

// backend/index.js

// POST /api/services - Create a new service
app.post('/api/services', authenticateAdmin, async (req, res) => {
  const { name, price_string, description, category } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Service name is required.' });
  }

  try {
    // 1. Get the current maximum sort_order
    const maxOrderResult = await db.query('SELECT MAX(sort_order) as max_sort_order FROM services');
    let newSortOrder = 0;
    if (maxOrderResult.rows.length > 0 && maxOrderResult.rows[0].max_sort_order !== null) {
      newSortOrder = maxOrderResult.rows[0].max_sort_order + 1;
    }

    // 2. Insert the new service with the calculated sort_order
    const newService = await db.query(
      `INSERT INTO services (name, price_string, description, category, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, // RETURNING * will return the newly created row including id and sort_order
      [
        name,
        price_string || null,
        description || null,
        category || 'Regular',
        newSortOrder // Add the newSortOrder here
      ]
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


// PUT /api/services/order - Reorder services
app.put('/api/services/order', authenticateAdmin, async (req, res) => {
  const { orderedIds } = req.body; // Expecting an array of service IDs in the new desired order

  if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== 'number')) {
    return res.status(400).json({ error: 'Invalid input: orderedIds must be an array of numbers.' });
  }

  if (orderedIds.length === 0) {
    // Technically not an error, but nothing to do.
    return res.json({ message: 'No services to reorder.' });
  }

  const client = await db.getClient(); // Get a client from the pool for transaction

  try {
    await client.query('BEGIN'); // Start transaction

    // Create an array of promises for all update operations
    const updatePromises = orderedIds.map((serviceId, index) => {
      const newSortOrder = index; // The new sort_order is the index in the array
      return client.query('UPDATE services SET sort_order = $1 WHERE id = $2', [newSortOrder, serviceId]);
    });

    await Promise.all(updatePromises); // Execute all updates

    await client.query('COMMIT'); // Commit transaction
    res.json({ message: 'Services reordered successfully.' });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error reordering services:', err.stack);
    res.status(500).json({ error: 'Failed to reorder services.' });
  } finally {
    client.release(); // Release client back to the pool
  }
});
// PUT /api/services/:id - Update an existing service
// Ensure this is placed before app.listen()

app.put('/api/services/:id', authenticateAdmin, async (req, res) => {
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

app.delete('/api/services/:id', authenticateAdmin, async (req, res) => {
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


// backend/index.js
// ... (after your other app.get, app.post, app.put, app.delete routes for services) ...

// POST /api/booking-request - Handle new booking requests using Postmark
// In backend/index.js

app.post('/api/booking-request', async (req, res) => {
  console.log('--- Booking Request ---'); 
  console.log('Received req.body for booking:', req.body);
  
  const {
    customerName, customerEmail, customerPhone,
    petName, petType, serviceName,
    preferredDateTime, notes,
    referralSource, // <<< Ensure this is destructured
    hp_fill_if_bot 
  } = req.body;

  if (hp_fill_if_bot) {
    console.log('Honeypot field filled for booking request. Likely spam. Request from:', customerEmail || 'unknown email');
    return res.status(200).json({ success: true, message: 'Request received.' }); 
  }

  if (!customerName || !customerEmail || !petName || !serviceName || !preferredDateTime) {
    return res.status(400).json({ 
      success: false,
      error: 'Please fill in all required fields: Your Name, Email, Pet Name(s), Service, and Preferred Date/Time.' 
    });
  }
  if (!/\S+@\S+\.\S+/.test(customerEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  if (!process.env.POSTMARK_SERVER_TOKEN || !process.env.SENDER_SIGNATURE_EMAIL || !process.env.RECIPIENT_EMAIL_ADDRESS) {
    console.error('Postmark configuration missing in .env file for booking request.');
    return res.status(500).json({ success: false, error: 'Email service configuration error on server.' });
  }
  
  const postmarkClient = new PostmarkClient(process.env.POSTMARK_SERVER_TOKEN);

  const mailToRecipientOptions = {
    "From": process.env.SENDER_SIGNATURE_EMAIL,
    "To": process.env.RECIPIENT_EMAIL_ADDRESS,
    "Subject": `New Booking Request: ${serviceName} for ${customerName}`,
    "HtmlBody": `
      <h2>New Booking Request Details:</h2>
      <p><strong>Customer Name:</strong> ${customerName}</p>
      <p><strong>Customer Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
      <p><strong>Customer Phone:</strong> ${customerPhone || 'Not provided'}</p>
      <hr>
      <p><strong>Pet Name(s):</strong> ${petName}</p>
      <p><strong>Pet Type:</strong> ${petType || 'Not specified'}</p>
      <hr>
      <p><strong>Service Interested In:</strong> ${serviceName}</p>
      <p><strong>Preferred Date/Time:</strong> ${preferredDateTime}</p>
      {/* VVVV ADDED THIS LINE for referralSource VVVV */}
      <p><strong>How they heard about us:</strong> ${referralSource || 'Not specified'}</p>
      <p><strong>Additional Notes/Special Requirements:</strong></p>
      <pre style="white-space: pre-wrap; word-wrap: break-word;">${notes || 'None'}</pre>
      <hr>
      <p><em>Please follow up with ${customerName}.</em></p>
    `,
    "MessageStream": "outbound" 
  };

  const mailToUserOptions = {
    "From": process.env.SENDER_SIGNATURE_EMAIL,
    "To": customerEmail,
    "Subject": `We've Received Your Booking Request for "${serviceName}"!`,
    "HtmlBody": `
      <p>Hi ${customerName},</p>
      <p>Thank you for your booking request for the service: <strong>${serviceName}</strong>.</p>
      <p>Your preferred date/time was noted as: ${preferredDateTime}.</p>
      <p>We have received your details and will aim to get back to you within 24-48 hours to confirm availability and discuss the next steps.</p>
      <p><strong>Your provided information:</strong></p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Name:</strong> ${customerName}</li>
        <li><strong>Email:</strong> ${customerEmail}</li>
        <li><strong>Phone:</strong> ${customerPhone || 'Not provided'}</li>
        <li><strong>Pet Name(s):</strong> ${petName}</li>
        <li><strong>Pet Type:</strong> ${petType || 'Not specified'}</li>
        <li><strong>Service:</strong> ${serviceName}</li>
        <li><strong>Preferred Date/Time:</strong> ${preferredDateTime}</li>
        {/* VVVV OPTIONAL: Added referralSource to user confirmation email VVVV */}
        ${referralSource ? `<li><strong>How you heard about us:</strong> ${referralSource}</li>` : ''}
        <li><strong>Notes:</strong> <pre style="white-space: pre-wrap; word-wrap: break-word;">${notes || 'None'}</pre></li>
      </ul>
      <p>If your request is urgent, or if you don't hear from us within 48 hours, please don't hesitate to check your spam folder or contact us directly.</p>
      <p>Best regards,</p>
      <p>The Team at Debbie's Pawsome Care</p>
    `,
    "MessageStream": "outbound"
  };
  
  try {
    await postmarkClient.sendEmail(mailToRecipientOptions);
    console.log('Booking request email sent to recipient via Postmark.');

    try {
      await postmarkClient.sendEmail(mailToUserOptions);
      console.log('Confirmation email sent to user via Postmark.');
    } catch (userEmailError) {
      console.error('Postmark: Failed to send confirmation email to user:', userEmailError);
    }

    res.status(200).json({ success: true, message: 'Booking request sent successfully! We will be in touch soon.' });

  } catch (error) {
    console.error('Postmark: Error sending booking request email:', error);
    const errorMessage = error.response && error.response.body && error.response.body.Message 
                       ? error.response.body.Message 
                       : error.message;
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send booking request due to an email service error. Please try again later.',
      details: errorMessage 
    });
  }
});


// POST /api/general-enquiry - Handle general contact form submissions
app.post('/api/general-enquiry', async (req, res) => {
  console.log('--- General Enquiry ---');
  console.log('Received req.body for enquiry:', req.body);

  const {
    name, email, subject, message,
    referralSource, // <<< Ensure this is destructured
    hp_fill_if_bot
  } = req.body;

  if (hp_fill_if_bot) {
    console.log('Honeypot field filled for general enquiry. Likely spam. Request from:', email || 'unknown email');
    return res.status(200).json({ success: true, message: 'Enquiry received.' });
  }

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all required fields: Your Name, Email, and Message.'
    });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
  }

  if (!process.env.POSTMARK_SERVER_TOKEN || !process.env.SENDER_SIGNATURE_EMAIL || !process.env.RECIPIENT_EMAIL_ADDRESS) {
    console.error('Postmark configuration missing in .env file for general enquiry.');
    return res.status(500).json({ success: false, error: 'Email service configuration error on server.' });
  }
  
  const postmarkClient = new PostmarkClient(process.env.POSTMARK_SERVER_TOKEN);

  const mailToRecipientOptions = {
    "From": process.env.SENDER_SIGNATURE_EMAIL,
    "To": process.env.RECIPIENT_EMAIL_ADDRESS,
    "Subject": `General Enquiry: ${subject || 'From ' + name}`,
    "HtmlBody": `
      <h2>New General Enquiry:</h2>
      <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
      <p><strong>Subject:</strong> ${subject || 'Not provided'}</p>
      {/* VVVV ADDED THIS LINE for referralSource VVVV */}
      <p><strong>How they heard about us:</strong> ${referralSource || 'Not specified'}</p>
      <hr>
      <p><strong>Message:</strong></p>
      <pre style="white-space: pre-wrap; word-wrap: break-word;">${message}</pre>
      <hr>
      <p><em>Received via website general enquiry form.</em></p>
    `,
    "MessageStream": "outbound" 
  };

  const mailToUserOptions = {
    "From": process.env.SENDER_SIGNATURE_EMAIL,
    "To": email, 
    "Subject": "We've Received Your Enquiry - Debbie's Pawsome Care",
    "HtmlBody": `
      <p>Hi ${name},</p>
      <p>Thank you for reaching out to Debbie's Awesome Pawsome Care!</p>
      <p>We have received your enquiry${subject ? ` regarding "${subject}"` : ''} and will get back to you as soon as possible.</p>
      {/* VVVV OPTIONAL: Added referralSource to user confirmation email VVVV */}
      ${referralSource ? `<p>For our records, you mentioned you heard about us via: ${referralSource}.</p>` : ''}
      <p>If your matter is urgent, please allow up to 24-48 hours for a response, especially during busy periods.</p>
      <p>Best regards,</p>
      <p>The Team at Debbie's Pawsome Care</p>
    `,
    "MessageStream": "outbound"
  };

  try {
    await postmarkClient.sendEmail(mailToRecipientOptions);
    console.log('General enquiry email sent to recipient via Postmark.');

    try {
        await postmarkClient.sendEmail(mailToUserOptions);
        console.log('General enquiry confirmation sent to user via Postmark.');
    } catch (userEmailError) {
        console.error('Postmark: Failed to send general enquiry confirmation to user:', userEmailError);
    }

    res.status(200).json({ success: true, message: 'Your enquiry has been sent successfully! We will be in touch.' });

  } catch (error) {
    console.error('Postmark: Error sending general enquiry email:', error);
    const errorMessage = error.response && error.response.body && error.response.body.Message 
                       ? error.response.body.Message 
                       : error.message;
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send your enquiry due to an email service error.',
      details: errorMessage 
    });
  }
});


// ... app.listen() ...


// Start the server
app.listen(PORT, () => {
  console.log(`Server (backend) is currently running on port ${PORT}`);
  // The "DB: PostgreSQL connected successfully..." message from db.js should also appear here
  // shortly after startup if the import of db.js triggers its connection test.
});
