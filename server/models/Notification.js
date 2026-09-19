/**
 * Notification Model
 *
 * Defines the schema for in-app system alerts.
 * Used to inform users about application status changes, profile completion reminders,
 * and administrative role assignments without relying solely on external email.
 */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // The specific user who should receive this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Categorizes the event to help the frontend determine the appropriate icon/color
    type: {
      type: String,
      required: true,
      enum: [
        "application_submitted",
        "status_changed",
        "admin_assigned",
        "profile_incomplete",
        "other", // Fallback for general announcements
      ],
    },
    
    // Short headline (e.g., "Status Updated")
    title: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Detailed context message
    message: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Tracks whether the user has opened the notification dropdown to view this alert
    read: {
      type: Boolean,
      default: false,
    },
    
    // Optional shortcut linking directly to the relevant application
    relatedApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
  },
  { 
    // Automatically manages createdAt and updatedAt timestamps
    timestamps: true 
  },
);

// Compile and export the Notification model
const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
