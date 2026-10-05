/**
 * Application Model
 *
 * Defines the schema and data lifecycle for student applications submitted to societies.
 * Tracks candidate responses to society-specific questions, application status transitions,
 * feedback notes, and compound indexing for applicant-society-role lookups.
 */

const mongoose = require("mongoose");

/**
 * Answer Sub-schema
 * Encapsulates a candidate's answer paired with the corresponding recruitment question.
 */
const answerSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Application Schema
 * Represents an individual submission by a student for a specific role within a society.
 */
const applicationSchema = new mongoose.Schema(
  {
    // The student who submitted the application
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The society to which the application was submitted
    society: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Society",
      required: true,
    },

    // The specific role applied for (matches openRoles.title or general submission)
    roleAppliedFor: {
      type: String,
      required: true,
      trim: true,
    },

    // Array of responses to general and role-specific questions
    answers: {
      type: [answerSchema],
      default: [],
    },

    // Current recruitment workflow status
    status: {
      type: String,
      enum: ["Pending", "Shortlisted", "Accepted", "Rejected"],
      default: "Pending",
    },

    // Optional internal or applicant-visible feedback note from society admins
    feedbackNote: {
      type: String,
      trim: true,
    },

    // Exact timestamp when the application was finalized
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize queries for a student's application per society role
applicationSchema.index({ student: 1, society: 1, roleAppliedFor: 1 });

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;
