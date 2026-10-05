/**
 * Admin Routes
 *
 * Defines the HTTP endpoints for society recruitment administration:
 * - Scoped applicant listing
 * - Application status updates with feedback and candidate notification
 * - Updating recruitment questions
 * - Toggling recruitment cycles
 *
 * All routes are protected and restricted to society_admin and super_admin roles.
 */

const express = require("express");
const router = express.Router();

const {
  getApplicants,
  updateStatus,
  updateQuestions,
  toggleRecruitment,
} = require("../controllers/adminController");

const { protect, authorize } = require("../middleware/authMiddleware");

// Enforce authentication and administrative authorization on all admin routes
router.use(protect);
router.use(authorize("society_admin", "super_admin"));

/**
 * @route   GET /api/admin/societies/:societyId/applications
 * @desc    Get all applicants for a specific society (keychain-guarded)
 * @access  Private (Society Admin / Super Admin)
 */
router.get("/societies/:societyId/applications", getApplicants);

/**
 * @route   GET /api/admin/societies/:societyId/applicants
 * @desc    Alias to get all applicants for a specific society
 * @access  Private (Society Admin / Super Admin)
 */
router.get("/societies/:societyId/applicants", getApplicants);

/**
 * @route   GET /api/admin/applicants/:societyId
 * @desc    Alias to get all applicants for a specific society
 * @access  Private (Society Admin / Super Admin)
 */
router.get("/applicants/:societyId", getApplicants);

/**
 * @route   GET /api/admin/applications
 * @desc    Get applicants for all managed societies or filtered by ?societyId=
 * @access  Private (Society Admin / Super Admin)
 */
router.get("/applications", getApplicants);

/**
 * @route   PATCH /api/admin/applications/:id/status
 * @desc    Update candidate application status and feedback note
 * @access  Private (Society Admin / Super Admin)
 */
router.patch("/applications/:id/status", updateStatus);

/**
 * @route   PATCH /api/admin/applicants/:societyId/:id/status
 * @desc    Alias to update candidate application status and feedback note
 * @access  Private (Society Admin / Super Admin)
 */
router.patch("/applicants/:societyId/:id/status", updateStatus);
router.patch("/applicants/:id/status", updateStatus);

/**
 * @route   PATCH /api/admin/societies/:societyId/questions
 * @desc    Update general and role-specific recruitment questions
 * @access  Private (Society Admin / Super Admin)
 */
router.patch("/societies/:societyId/questions", updateQuestions);

/**
 * @route   PATCH /api/admin/societies/:societyId/recruitment
 * @desc    Toggle society recruitment open/closed status and set deadlines
 * @access  Private (Society Admin / Super Admin)
 */
router.patch("/societies/:societyId/recruitment", toggleRecruitment);

module.exports = router;
