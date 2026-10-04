const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configuration to prevent abuse and brute force attacks.
 * Uses an in-memory store, which is sufficient for a single-instance setup.
 */

/**
 * Auth Limiter
 * Limits authentication attempts to prevent credential stuffing.
 * Allows 20 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Application Limiter
 * Limits application submissions to prevent spam.
 * Allows 10 requests per 15 minutes per IP.
 */
const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per window
  message: {
    success: false,
    message: 'Too many application submissions from this IP, please try again later'
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  applicationLimiter
};
