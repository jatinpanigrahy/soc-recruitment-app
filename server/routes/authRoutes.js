const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../middleware/validateMiddleware');

const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email (generates reset token)
 * @access  Public
 */
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using valid token
 * @access  Public
 */
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), resetPassword);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user's profile
 * @access  Protected (Requires JWT)
 */
router.get('/me', protect, getMe);

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update user profile details
 * @access  Protected (Requires JWT)
 */
router.patch('/profile', protect, validate(updateProfileSchema), updateProfile);

module.exports = router;
