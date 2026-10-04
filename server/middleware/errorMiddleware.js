/**
 * Centralized Error Handling Middleware
 * 
 * Catches all unhandled errors in the request lifecycle and formats them 
 * into a consistent JSON response envelope. Prevents raw stack traces 
 * from leaking in production environments.
 * 
 * @param {Error} err - The error object caught by Express
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The next middleware function in the stack
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log the error to the console for developer visibility
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // Handle Mongoose bad ObjectId error (e.g., invalid document ID)
  if (err.name === 'CastError') {
    const message = `Resource not found with ID of ${err.value}`;
    error = new Error(message);
    error.statusCode = 404;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // Handle JSON Web Token invalid error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new Error(message);
    error.statusCode = 401;
  }

  // Handle JSON Web Token expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new Error(message);
    error.statusCode = 401;
  }

  // Determine the final status code
  const statusCode = error.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  
  // Return a standardized JSON response envelope
  res.status(statusCode === 200 ? 500 : statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    // Only include the stack trace if we are not in production
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
