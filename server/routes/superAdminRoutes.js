/**
 * Super Admin Routes
 *
 * Defines the HTTP endpoints for platform super administration:
 * - Creating new societies with multipart logo upload (multer memory storage)
 * - Toggling society archive state
 * - Promoting users to society_admin and assigning managed societies
 * - Listing all platform users
 * - System-wide recruitment analytics
 *
 * All routes are protected and restricted to the super_admin role.
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  createSociety,
  archiveSociety,
  promoteUser,
  listUsers,
  analytics,
} = require("../controllers/superAdminController");

const { protect, authorize } = require("../middleware/authMiddleware");

// Configure multer with in-memory storage buffer for Cloudinary stream upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
});

/**
 * Middleware handling multipart logo upload with memory buffer attachment
 */
const uploadLogo = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files.find((f) => f.fieldname === "logo") || req.files[0];
    }
    next();
  });
};

// Enforce authentication and super_admin authorization on all routes
router.use(protect);
router.use(authorize("super_admin"));

/**
 * @route   POST /api/super-admin/societies
 * @desc    Create a new society with Cloudinary logo upload
 * @access  Private (Super Admin)
 */
router.post("/societies", uploadLogo, createSociety);

/**
 * @route   PATCH /api/super-admin/societies/:id/archive
 * @desc    Toggle society archive state (soft delete)
 * @access  Private (Super Admin)
 */
router.patch("/societies/:id/archive", archiveSociety);

/**
 * @route   PATCH /api/super-admin/users/:id/promote
 * @desc    Promote user to society_admin and assign managed societies keychain
 * @access  Private (Super Admin)
 */
router.patch("/users/:id/promote", promoteUser);

/**
 * @route   PATCH /api/super-admin/promote-user
 * @desc    Alias to promote user to society_admin and assign managed societies
 * @access  Private (Super Admin)
 */
router.patch("/promote-user", promoteUser);

/**
 * @route   GET /api/super-admin/users
 * @desc    List all platform users with optional role and search filters
 * @access  Private (Super Admin)
 */
router.get("/users", listUsers);

/**
 * @route   GET /api/super-admin/analytics
 * @desc    Aggregate platform recruitment and society metrics
 * @access  Private (Super Admin)
 */
router.get("/analytics", analytics);

module.exports = router;
