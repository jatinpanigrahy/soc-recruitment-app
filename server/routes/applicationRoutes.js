/**
 * Application Routes
 *
 * Defines the HTTP endpoints for application submissions, modifications,
 * and personal application history retrieval.
 */

const express = require("express");
const router = express.Router();

const {
  submitApplication,
  editApplication,
  getMyApplications,
} = require("../controllers/applicationController");

const { protect } = require("../middleware/authMiddleware");
const { applicationLimiter } = require("../middleware/rateLimiter");
const {
  validate,
  submitApplicationSchema,
  editApplicationSchema,
} = require("../middleware/validateMiddleware");

/**
 * @route   POST /api/applications
 * @desc    Submit a new role application
 * @access  Private (Authenticated User)
 */
router.post(
  "/",
  protect,
  applicationLimiter,
  validate(submitApplicationSchema),
  submitApplication
);

/**
 * @route   GET /api/applications/my
 * @desc    Fetch all applications submitted by the current authenticated user
 * @access  Private (Authenticated User)
 */
router.get("/my", protect, getMyApplications);

/**
 * @route   PATCH /api/applications/:id
 * @desc    Edit responses for a pending application before society deadline
 * @access  Private (Application Owner)
 */
router.patch(
  "/:id",
  protect,
  validate(editApplicationSchema),
  editApplication
);

module.exports = router;
