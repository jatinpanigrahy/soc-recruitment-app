/**
 * Application Controller
 *
 * Manages student application submissions, updates, and personal history queries.
 * Enforces business rules: recruitment deadlines, Open Window duplicate controls,
 * multi-role submission toggles, and ownership verification.
 */

const Application = require("../models/Application");
const Society = require("../models/Society");
const { sendMockEmail } = require("../utils/mockEmail");

/**
 * @desc    Submit a new application for a society role
 * @route   POST /api/applications
 * @access  Private (Student / Authenticated User)
 */
const submitApplication = async (req, res) => {
  try {
    const { societyId, roleAppliedFor, answers } = req.body;
    const studentId = req.user._id || req.user.id;

    // Look up target society
    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    // Check if society recruitment deadline has elapsed
    if (society.deadline && Date.now() > new Date(society.deadline).getTime()) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is closed",
      });
    }

    // Determine active recruitment cycle start boundary (fallback to 90 days ago if undefined)
    const cycleStart =
      society.recruitmentOpenedAt ||
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Open Window Rule: check if student has already applied to this specific role in the active cycle
    const roleFilter = {
      student: studentId,
      society: society._id,
      roleAppliedFor,
      submittedAt: { $gt: cycleStart },
    };

    const existingRoleApp = await Application.findOne(roleFilter);
    if (existingRoleApp) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this role in the current recruitment cycle",
      });
    }

    // Multi-role toggle: check if society restricts applicants to a single role per cycle
    if (society.allowMultipleRoles === false) {
      const anyRoleFilter = {
        student: studentId,
        society: society._id,
        submittedAt: { $gt: cycleStart },
      };

      const existingAnyApp = await Application.findOne(anyRoleFilter);
      if (existingAnyApp) {
        return res.status(400).json({
          success: false,
          message: "This society only allows one application per cycle",
        });
      }
    }

    // Create and save new application
    const application = await Application.create({
      student: studentId,
      society: society._id,
      roleAppliedFor,
      answers: answers || [],
      status: "Pending",
      submittedAt: new Date(),
    });

    // Send mock confirmation email & generate in-app notification
    await sendMockEmail({
      to: req.user.email || "applicant@example.com",
      subject: `Application Submitted - ${society.name}`,
      body: `Your application for the role "${roleAppliedFor}" at ${society.name} has been successfully submitted and is currently pending review.`,
      userId: studentId,
      relatedApplicationId: application._id,
      type: "application_submitted",
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
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
 * @desc    Edit answers for a pending application before recruitment deadline
 * @route   PATCH /api/applications/:id
 * @access  Private (Application Owner)
 */
const editApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const currentUserId = (req.user._id || req.user.id).toString();

    // Find target application
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Ensure ownership: applicant can only edit their own application
    if (application.student.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this application",
      });
    }

    // Check society deadline
    const society = await Society.findById(application.society);
    if (society && society.deadline && Date.now() > new Date(society.deadline).getTime()) {
      return res.status(400).json({
        success: false,
        message: "Recruitment is closed",
      });
    }

    // Check application status: only 'Pending' applications can be modified
    if (application.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit an application that is no longer pending",
      });
    }

    // Update answers and persist
    application.answers = answers;
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: application,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Fetch all applications submitted by the logged-in student
 * @route   GET /api/applications/my
 * @access  Private (Authenticated User)
 */
const getMyApplications = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;

    // Fetch user applications populated with society branding details
    const applications = await Application.find({ student: studentId })
      .populate("society", "name logoUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  submitApplication,
  editApplication,
  getMyApplications,
};
