/**
 * Mock Email Utility
 *
 * Simulates outgoing transactional emails by logging message details to the console
 * and generating an in-app Notification record in MongoDB for the recipient.
 */

const Notification = require("../models/Notification");

/**
 * Sends a simulated email notification and stores it as an in-app notification.
 *
 * @param {Object} params - Notification and mock email parameters.
 * @param {string} params.to - Recipient email address.
 * @param {string} params.subject - Email subject line (used as notification title).
 * @param {string} params.body - Email body text (used as notification message).
 * @param {string|import("mongoose").Types.ObjectId} params.userId - Recipient user ObjectId.
 * @param {string|import("mongoose").Types.ObjectId} [params.relatedApplicationId] - Optional linked application ID.
 * @param {string} [params.type='other'] - Notification category enum.
 * @returns {Promise<Object>} Created notification document.
 */
const sendMockEmail = async ({
  to,
  subject,
  body,
  userId,
  relatedApplicationId,
  type = "other",
}) => {
  console.log("========================================");
  console.log("[MOCK EMAIL DISPATCHED]");
  console.log(`To:          ${to}`);
  console.log(`Subject:     ${subject}`);
  console.log(`Type:        ${type}`);
  console.log(`Application: ${relatedApplicationId || "None"}`);
  console.log(`Body:\n${body}`);
  console.log("========================================");

  const notification = await Notification.create({
    recipient: userId,
    type,
    title: subject,
    message: body,
    relatedApplication: relatedApplicationId,
  });

  return notification;
};

module.exports = { sendMockEmail };
// Also support direct function import
module.exports.sendMockEmail = sendMockEmail;
