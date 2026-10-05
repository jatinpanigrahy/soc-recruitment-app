/**
 * Admin Controller
 *
 * Manages recruitment pipeline operations for society administrators and super administrators:
 * - Applicant retrieval scoped to managed societies (keychain guarded)
 * - Application status updates with feedback notes, mock emails, and notifications
 * - Updating recruitment questions (general and role-specific)
 * - Toggling recruitment cycles (opening/closing deadlines and anchors)
 */

const Application = require("../models/Application");
const Society = require("../models/Society");
const { sendMockEmail } = require("../utils/mockEmail");

/**
 * Validates Keychain Guard for society administrators.
 * Returns true if user is super_admin or has societyId in their managedSocieties.
 *
 * @param {Object} user - The authenticated req.user object.
 * @param {string|import("mongoose").Types.ObjectId} societyId - The target society ID.
 * @returns {boolean} Whether access is permitted.
 */
const verifyKeychainAccess = (user, societyId) => {
  if (user.role === "super_admin") {
    return true;
  }
  if (user.role === "society_admin") {
    if (!user.managedSocieties || !Array.isArray(user.managedSocieties)) {
      return false;
    }
    return user.managedSocieties.some(
      (id) => id.toString() === societyId.toString()
    );
  }
  return false;
};

/**
 * @desc    Fetch applicants for a specific society or all managed societies
 * @route   GET /api/admin/societies/:societyId/applications
 * @route   GET /api/admin/societies/:societyId/applicants
 * @route   GET /api/admin/applications
 * @access  Private (Society Admin / Super Admin)
 */
const getApplicants = async (req, res) => {
  try {
    const societyId = req.params.societyId || req.query.societyId;
    const filter = {};

    if (societyId) {
      // Enforce Keychain Guard
      if (req.user.role === "society_admin" && !verifyKeychainAccess(req.user, societyId)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to access this society's applications",
        });
      }
      filter.society = societyId;
    } else {
      // No societyId explicitly specified: scope to all societies on user's keychain
      if (req.user.role === "society_admin") {
        const managed = req.user.managedSocieties || [];
        filter.society = { $in: managed };
      }
      // Super admins without query param see all applicants
    }

    // Optional status and role filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.role || req.query.roleAppliedFor) {
      filter.roleAppliedFor = req.query.role || req.query.roleAppliedFor;
    }

    const applications = await Application.find(filter)
      .populate("student", "fullName username email branch year avatarUrl")
      .populate("society", "name logoUrl category deadline")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
      message: "Applicants retrieved successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Invalid society ID format",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update candidate application status, optional feedback note, and dispatch notifications
 * @route   PATCH /api/admin/applications/:id/status
 * @access  Private (Society Admin / Super Admin)
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedbackNote } = req.body;

    const validStatuses = ["Pending", "Shortlisted", "Accepted", "Rejected"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Retrieve target application with populated relations
    const application = await Application.findById(id)
      .populate("society", "name")
      .populate("student", "email fullName username");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Enforce Keychain Guard
    const societyId = application.society?._id || application.society;
    if (req.user.role === "society_admin" && !verifyKeychainAccess(req.user, societyId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to manage applications for this society",
      });
    }

    // Update status and optional feedback note
    application.status = status;
    const defaultFeedback = "Your application status has been updated. Check the platform for details.";
    if (feedbackNote !== undefined && feedbackNote.trim() !== "") {
      application.feedbackNote = feedbackNote.trim();
    } else if (!application.feedbackNote) {
      application.feedbackNote = defaultFeedback;
    }

    await application.save();

    // Trigger mock email and in-app Notification
    const societyName = application.society?.name || "Society";
    const studentEmail = application.student?.email || "student@example.com";
    const studentId = application.student?._id || application.student;
    const noteText = application.feedbackNote ? `\n\nFeedback: ${application.feedbackNote}` : "";

    await sendMockEmail({
      to: studentEmail,
      subject: `Application Status Updated - ${societyName}`,
      body: `Your application for the role "${application.roleAppliedFor}" at ${societyName} has been updated to "${status}".${noteText}`,
      userId: studentId,
      relatedApplicationId: application._id,
      type: "status_changed",
    });

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
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
 * @desc    Update society general and role-specific recruitment questions
 * @route   PATCH /api/admin/societies/:societyId/questions
 * @access  Private (Society Admin / Super Admin)
 */
const updateQuestions = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { generalQuestions, roleQuestions, openRoles } = req.body;

    // Enforce Keychain Guard
    if (req.user.role === "society_admin" && !verifyKeychainAccess(req.user, societyId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to update questions for this society",
      });
    }

    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    // Update general questions if provided
    if (generalQuestions !== undefined && Array.isArray(generalQuestions)) {
      society.generalQuestions = generalQuestions;
    }

    // Update role-specific questions via roleQuestions array or object
    if (Array.isArray(roleQuestions)) {
      roleQuestions.forEach((item) => {
        const role = society.openRoles.find(
          (r) =>
            (item.roleId && r._id.toString() === item.roleId.toString()) ||
            (item._id && r._id.toString() === item._id.toString()) ||
            (item.roleTitle && r.title.toLowerCase() === item.roleTitle.toLowerCase()) ||
            (item.title && r.title.toLowerCase() === item.title.toLowerCase())
        );
        if (role && Array.isArray(item.questions)) {
          role.questions = item.questions;
        }
      });
    } else if (roleQuestions && typeof roleQuestions === "object") {
      Object.entries(roleQuestions).forEach(([key, questions]) => {
        const role = society.openRoles.find(
          (r) =>
            r._id.toString() === key ||
            r.title.toLowerCase() === key.toLowerCase()
        );
        if (role && Array.isArray(questions)) {
          role.questions = questions;
        }
      });
    }

    // Update or merge full openRoles array if provided
    if (Array.isArray(openRoles)) {
      openRoles.forEach((incomingRole) => {
        const existingRole = society.openRoles.find(
          (r) =>
            (incomingRole._id && r._id.toString() === incomingRole._id.toString()) ||
            (incomingRole.title && r.title.toLowerCase() === incomingRole.title.toLowerCase())
        );
        if (existingRole) {
          if (Array.isArray(incomingRole.questions)) {
            existingRole.questions = incomingRole.questions;
          }
          if (incomingRole.title) existingRole.title = incomingRole.title;
          if (incomingRole.description !== undefined) existingRole.description = incomingRole.description;
          if (incomingRole.requirements !== undefined) existingRole.requirements = incomingRole.requirements;
        } else if (incomingRole.title) {
          society.openRoles.push(incomingRole);
        }
      });
    }

    await society.save();

    return res.status(200).json({
      success: true,
      message: "Questions updated successfully",
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
 * @desc    Toggle recruitment open/closed status by updating recruitmentOpenedAt and deadline
 * @route   PATCH /api/admin/societies/:societyId/recruitment
 * @access  Private (Society Admin / Super Admin)
 */
const toggleRecruitment = async (req, res) => {
  try {
    const { societyId } = req.params;
    const { isOpen, deadline, recruitmentOpenedAt } = req.body;

    // Enforce Keychain Guard
    if (req.user.role === "society_admin" && !verifyKeychainAccess(req.user, societyId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to toggle recruitment for this society",
      });
    }

    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    const now = Date.now();
    const isCurrentlyOpen = society.deadline && new Date(society.deadline).getTime() > now;

    if (isOpen !== undefined) {
      if (isOpen) {
        society.recruitmentOpenedAt = recruitmentOpenedAt ? new Date(recruitmentOpenedAt) : new Date();
        society.deadline = deadline ? new Date(deadline) : new Date(now + 14 * 24 * 60 * 60 * 1000);
      } else {
        society.deadline = new Date(now - 1000);
      }
    } else if (deadline) {
      society.deadline = new Date(deadline);
      if (new Date(deadline).getTime() > now) {
        society.recruitmentOpenedAt = recruitmentOpenedAt ? new Date(recruitmentOpenedAt) : (society.recruitmentOpenedAt || new Date());
      }
    } else {
      // Simple toggle when no body flags are specified
      if (isCurrentlyOpen) {
        society.deadline = new Date(now - 1000);
      } else {
        society.recruitmentOpenedAt = new Date();
        society.deadline = new Date(now + 14 * 24 * 60 * 60 * 1000);
      }
    }

    await society.save();

    const isNowOpen = society.deadline && new Date(society.deadline).getTime() > Date.now();

    return res.status(200).json({
      success: true,
      message: `Recruitment ${isNowOpen ? "opened" : "closed"} successfully`,
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

module.exports = {
  getApplicants,
  updateStatus,
  updateQuestions,
  toggleRecruitment,
};
