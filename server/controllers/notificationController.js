/**
 * Notification Controller
 *
 * Handles in-app notifications and system alerts for authenticated users:
 * - Fetching personal notifications with unread counts
 * - Marking individual notifications as read
 * - Bulk marking all personal notifications as read
 */

const Notification = require("../models/Notification");

/**
 * @desc    Fetch all notifications for the current authenticated user
 * @route   GET /api/notifications
 * @access  Private (Authenticated User)
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .populate({
          path: "relatedApplication",
          select: "roleAppliedFor status society",
          populate: {
            path: "society",
            select: "name logoUrl",
          },
        })
        .sort({ createdAt: -1 }),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
      message: "Notifications retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Mark a specific notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Notification Owner)
 */
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req.user._id || req.user.id).toString();

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this notification",
      });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Mark all unread notifications for current user as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Authenticated User)
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        modifiedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
