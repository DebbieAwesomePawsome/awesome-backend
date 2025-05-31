import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Verifies the provided admin username and password against the credentials
 * stored in environment variables.
 * @param {string} username - The username to verify.
 * @param {string} password - The plain text password to verify.
 * @returns {boolean} - True if credentials are valid, false otherwise.
 */
export function verifyAdminCredentials(username, password) {
  const validUsername = process.env.ADMIN_USERNAME;
  const validPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!validUsername || !validPasswordHash) {
    console.error('CRITICAL: Admin username or password hash not configured in .env file!');
    return false;
  }

  // Check if the provided username matches the admin username
  const isUsernameMatch = (username === validUsername);
  if (!isUsernameMatch) {
    return false; // Username doesn't match
  }

  // If username matches, compare the provided password with the stored hash
  // bcrypt.compareSync will securely compare the plain password with the hash
  return bcrypt.compareSync(password, validPasswordHash);
}

/**
 * Generates a JSON Web Token (JWT) for the authenticated admin user.
 * @param {object} adminData - Data to include in the JWT payload (e.g., { username, role: 'admin' }).
 * @returns {string} - The generated JWT.
 */
export function generateToken(adminData) {
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET not configured in .env file!');
    // In a real app, you might throw an error here or handle it more gracefully
    return null; 
  }
  return jwt.sign(
    adminData,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Use expiration from .env or default to 1 hour
  );
}

/**
 * Middleware function to authenticate admin users by verifying a JWT from the Authorization header.
 * If the token is valid, it attaches the decoded user information to req.user.
 * If the token is missing or invalid, it sends an appropriate error response.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Expected format: "Bearer TOKEN_STRING"

    if (!token) {
      // This case might happen if the header is "Bearer " but no token follows
      return res.status(401).json({ error: 'Access token is missing or malformed.' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET not configured in .env file! Cannot verify token.');
      return res.status(500).json({ error: 'Authentication configuration error.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedTokenPayload) => {
      if (err) {
        // Token is invalid (e.g., expired, wrong signature)
        console.warn('JWT verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
      }

      // Token is valid, attach decoded payload to the request object
      // This typically includes user information like username, role, etc.
      req.user = decodedTokenPayload; 
      next(); // Proceed to the next middleware or the protected route handler
    });
  } else {
    // No Authorization header found
    return res.status(401).json({ error: 'Authorization header with bearer token is required.' });
  }
}