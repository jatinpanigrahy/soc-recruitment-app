/**
 * Notification Routes
 *
 * Defines the HTTP endpoints for in-app user notifications:
 * - Listing notifications for current authenticated user
 * - Marking single notification as read
 * - Bulk marking all notifications as read
 *
 * All routes are protected and require a valid Bearer token.
 */

const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markRead,
  markAllRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

// Enforce authentication on all notification routes
router.use(protect);

/**
 * @route   GET /api/notifications
 * @desc    Fetch notifications for current authenticated user
 * @access  Private (Authenticated User)
 */
router.get("/", getNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's unread notifications as read
 * @access  Private (Authenticated User)
 */
router.patch("/read-all", markAllRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private (Notification Owner)
 */
router.patch("/:id/read", markRead);

module.exports = router;
