/**
 * Super Admin Controller
 *
 * Implements platform-wide governance for the system super administrator:
 * - Creating societies with multipart/form-data and Cloudinary logo upload
 * - Archiving and restoring societies (soft-delete toggle)
 * - Promoting users to society administrators and assigning managed societies keychain
 * - Listing all platform users with role and search filtering
 * - Platform analytics (total applicant count, per-society application metrics, status breakdown)
 */

const streamifier = require("streamifier");
const Society = require("../models/Society");
const User = require("../models/User");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");

/**
 * Uploads an image buffer directly to Cloudinary using a stream.
 * Gracefully falls back to placeholder URL if Cloudinary is unconfigured.
 *
 * @param {Buffer} buffer - Image file buffer from multer memory storage.
 * @param {string} [folder="societies"] - Cloudinary destination folder.
 * @returns {Promise<Object>} Cloudinary upload result.
 */
const uploadToCloudinary = (buffer, folder = "societies") => {
  return new Promise((resolve, reject) => {
    // Graceful fallback for test and non-configured environments
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return resolve({
        secure_url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Safely parses JSON string or returns original value if already parsed.
 *
 * @param {any} value - Value to check and parse.
 * @param {any} fallback - Default fallback value if parse fails.
 * @returns {any} Parsed value or fallback.
 */
const safeJsonParse = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

/**
 * @desc    Create a new society with Cloudinary logo upload
 * @route   POST /api/super-admin/societies
 * @access  Private (Super Admin)
 */
const createSociety = async (req, res) => {
  try {
    const {
      name,
      category,
      tagline,
      description,
      deadline,
      recruitmentOpenedAt,
      allowMultipleRoles,
    } = req.body;

    if (!name || !category || !tagline || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: name, category, tagline, description",
      });
    }

    const existingSociety = await Society.findOne({ name: name.trim() });
    if (existingSociety) {
      return res.status(400).json({
        success: false,
        message: "Society with this name already exists",
      });
    }

    // Process logo upload if file provided
    let logoUrl = req.body.logoUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c";
    if (req.file && req.file.buffer) {
      try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "societies");
        logoUrl = uploadResult.secure_url || uploadResult.url || logoUrl;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: `Failed to upload logo to Cloudinary: ${uploadError.message}`,
        });
      }
    }

    // Parse array/object fields from multipart payload
    const openRoles = safeJsonParse(req.body.openRoles, []);
    const generalQuestions = safeJsonParse(req.body.generalQuestions, undefined);
    const socialLinks = safeJsonParse(req.body.socialLinks, {});

    const society = await Society.create({
      name: name.trim(),
      category: category.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      logoUrl,
      deadline: deadline ? new Date(deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      recruitmentOpenedAt: recruitmentOpenedAt ? new Date(recruitmentOpenedAt) : new Date(),
      allowMultipleRoles: allowMultipleRoles !== undefined ? (allowMultipleRoles === "true" || allowMultipleRoles === true) : true,
      openRoles: Array.isArray(openRoles) ? openRoles : [],
      generalQuestions: Array.isArray(generalQuestions) ? generalQuestions : undefined,
      socialLinks: typeof socialLinks === "object" ? socialLinks : {},
    });

    return res.status(201).json({
      success: true,
      message: "Society created successfully",
      data: society,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Toggle society archive state (soft-delete)
 * @route   PATCH /api/super-admin/societies/:id/archive
 * @access  Private (Super Admin)
 */
const archiveSociety = async (req, res) => {
  try {
    const { id } = req.params;

    const society = await Society.findById(id);
    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    society.isArchived = req.body.isArchived !== undefined ? req.body.isArchived : !society.isArchived;
    await society.save();

    return res.status(200).json({
      success: true,
      message: `Society ${society.isArchived ? "archived" : "unarchived"} successfully`,
      data: society,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Promote user to society_admin and assign managed societies keychain
 * @route   PATCH /api/super-admin/users/:id/promote
 * @access  Private (Super Admin)
 */
const promoteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role = "society_admin", managedSocieties } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;

    if (managedSocieties !== undefined) {
      user.managedSocieties = Array.isArray(managedSocieties)
        ? managedSocieties
        : [managedSocieties];
    }

    await user.save();
    await user.populate("managedSocieties", "name logoUrl category");

    // Create an in-app notification informing user of admin appointment
    await Notification.create({
      recipient: user._id,
      type: "admin_assigned",
      title: "Role Updated",
      message: `Your account role has been updated to "${user.role}". You can now access administrative privileges.`,
    });

    return res.status(200).json({
      success: true,
      message: "User promoted successfully",
      data: user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    List all platform users with filtering options
 * @route   GET /api/super-admin/users
 * @access  Private (Super Admin)
 */
const listUsers = async (req, res) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { fullName: searchRegex },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .populate("managedSocieties", "name logoUrl category")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
      message: "Users retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Aggregate platform-wide recruitment metrics
 * @route   GET /api/super-admin/analytics
 * @access  Private (Super Admin)
 */
const analytics = async (req, res) => {
  try {
    const [totalApplicants, totalUsers, totalSocieties] = await Promise.all([
      Application.countDocuments(),
      User.countDocuments(),
      Society.countDocuments(),
    ]);

    // Aggregate applications grouped per society
    const perSocietyRaw = await Application.aggregate([
      {
        $group: {
          _id: "$society",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "societies",
          localField: "_id",
          foreignField: "_id",
          as: "societyDetails",
        },
      },
      {
        $unwind: {
          path: "$societyDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          societyId: "$_id",
          societyName: { $ifNull: ["$societyDetails.name", "Unknown"] },
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Aggregate applications breakdown by status
    const statusCountsRaw = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusBreakdown = {
      Pending: 0,
      Shortlisted: 0,
      Accepted: 0,
      Rejected: 0,
    };

    statusCountsRaw.forEach((item) => {
      if (item._id && statusBreakdown[item._id] !== undefined) {
        statusBreakdown[item._id] = item.count;
      }
    });

    const analyticsData = {
      totalApplicants,
      totalApplications: totalApplicants,
      totalUsers,
      totalSocieties,
      perSocietyCounts: perSocietyRaw,
      statusBreakdown,
    };

    return res.status(200).json({
      success: true,
      data: analyticsData,
      message: "Analytics fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSociety,
  archiveSociety,
  promoteUser,
  listUsers,
  analytics,
};
