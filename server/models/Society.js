/**
 * Society Model
 *
 * Defines the schema and relational structure for college societies and student clubs.
 * Supports multi-tenant administration, open-window recruitment tracking,
 * soft archiving, embedded role definitions with role-specific questions,
 * club-wide general questions, and verified social media channels.
 */

const mongoose = require("mongoose");

/**
 * Sub-schema for individual recruitment positions.
 * Embedded directly within each Society document.
 */
const openRoleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  requirements: {
    type: String,
    trim: true,
  },
  // Specific questions asked only to applicants for this specific role
  questions: {
    type: [String],
    default: [],
  },
});

/**
 * Main Society Schema
 * Represents an official collegiate society or club.
 */
const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Flexible category string without hardcoded enums (e.g. Technical, Cultural, Literary, Sports)
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
    },
    // Server-enforced cutoff date for applications
    deadline: {
      type: Date,
      required: true,
    },
    // Timestamp marking when the recruitment cycle was opened (supports the Open Window Rule)
    recruitmentOpenedAt: {
      type: Date,
    },
    // Soft-delete flag: archived societies vanish from public discovery without losing applicant history
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Controls whether a student can submit applications to multiple roles in this society
    allowMultipleRoles: {
      type: Boolean,
      default: true,
    },
    // Embedded list of open recruitment positions
    openRoles: [openRoleSchema],
    // Club-wide recruitment questions asked to all applicants regardless of role
    generalQuestions: {
      type: [String],
      default: [
        "Why do you want to join our society?",
        "Describe any relevant past experience or share portfolio / work links.",
      ],
    },
    // Verified external presence and social channels (trimmed to sanitize accidental whitespace)
    socialLinks: {
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      reddit: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
      discord: { type: String, trim: true },
      website: { type: String, trim: true },
    },
  },
  {
    // Automatically creates and updates createdAt and updatedAt timestamps
    timestamps: true,
  },
);

// Explicit MongoDB indexes on category and name fields to optimize search queries
societySchema.index({ category: 1 });
societySchema.index({ name: 1 });

// Compile and export Society model
const Society = mongoose.model("Society", societySchema);

module.exports = Society;
