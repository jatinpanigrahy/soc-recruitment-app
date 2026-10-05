/**
 * Society Controller
 *
 * Handles incoming HTTP requests for society discovery, including
 * category-based filtering, case-insensitive text searching,
 * and single society detail retrieval.
 */

const Society = require("../models/Society");

/**
 * @desc    Fetch all societies with optional category filtering, search, and pagination
 * @route   GET /api/societies
 * @access  Public
 * @query   {string} [category] - Filter societies by category
 * @query   {string} [search] - Case-insensitive text search on society name
 * @query   {number} [page=1] - 1-based page number
 * @query   {number} [limit=12] - Number of items per page
 * @query   {string} [sort] - Sort criteria ('deadline', 'name_asc', or default by createdAt descending)
 */
const getAllSocieties = async (req, res) => {
  try {
    const { category, search, sort } = req.query;

    // Parse and sanitize pagination parameters (defaults: page 1, limit 12)
    const pageNumber = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(req.query.limit, 10) || 12);
    const skip = (pageNumber - 1) * limitNumber;

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

    // Determine sort order
    let sortOption = { createdAt: -1 };
    if (sort === "deadline") {
      sortOption = { deadline: 1 };
    } else if (sort === "name_asc") {
      sortOption = { name: 1 };
    }

    // Count total matching documents for pagination calculation
    const totalCount = await Society.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasMore = pageNumber < totalPages;

    // Fetch paginated societies sorted with skip and limit
    const societies = await Society.find(queryFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      count: societies.length,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        total: totalCount,
        hasMore,
      },
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
