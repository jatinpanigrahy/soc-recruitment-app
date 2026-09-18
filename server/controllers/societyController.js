/**
 * Society Controller
 *
 * Handles incoming HTTP requests for society discovery, including
 * category-based filtering, case-insensitive text searching,
 * and single society detail retrieval.
 */

const Society = require("../models/Society");

/**
 * @desc    Fetch all societies with optional category filtering and search
 * @route   GET /api/societies
 * @access  Public
 */
const getAllSocieties = async (req, res) => {
  try {
    const { category, search } = req.query;

    // Build dynamic query filter
    const queryFilter = {};

    // Apply category filter if specified and not 'All'
    if (category && category !== "All") {
      queryFilter.category = category;
    }

    // Apply case-insensitive regex search on society name
    if (search) {
      queryFilter.name = { $regex: search, $options: "i" };
    }

    // Fetch societies sorted by newest first
    const societies = await Society.find(queryFilter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: societies.length,
      data: societies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Fetch a single society by its MongoDB ObjectId
 * @route   GET /api/societies/:id
 * @access  Public
 */
const getSocietyById = async (req, res) => {
  try {
    const { id } = req.params;
    const society = await Society.findById(id);

    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: society,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllSocieties,
  getSocietyById,
};
