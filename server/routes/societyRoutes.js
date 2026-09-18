/**
 * Society Routes
 *
 * Defines the public endpoints for discovering, searching,
 * and fetching college society details.
 */

const express = require("express");
const router = express.Router();

const {
  getAllSocieties,
  getSocietyById,
} = require("../controllers/societyController");

// @route   GET /api/societies
// @desc    List all societies with optional ?category= and ?search= query filters
// @access  Public
router.get("/", getAllSocieties);

// @route   GET /api/societies/:id
// @desc    Fetch comprehensive details for a specific society by its ID
// @access  Public
router.get("/:id", getSocietyById);

module.exports = router;
