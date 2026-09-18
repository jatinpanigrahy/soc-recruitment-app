/**
 * Society Model
 *
 * Defines the schema and data validation rules for college societies,
 * including embedded open recruitment roles and dynamic application questions.
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
});

/**
 * Main Society Schema
 * Represents an official college club or society.
 */
const societySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Technical", "Cultural", "Sports", "Literary"],
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
    deadline: {
      type: Date,
      required: true,
    },
    // Embedded list of open recruitment roles
    openRoles: [openRoleSchema],
    // Dynamic list of recruitment questions customizable per society
    customQuestions: {
      type: [String],
      default: [
        "Why do you want to join our society?",
        "Describe any relevant past experience or share portfolio / work links.",
      ],
    },
  },
  {
    // Automatically manage createdAt and updatedAt timestamps
    timestamps: true,
  },
);

// Compile and export Society model
const Society = mongoose.model("Society", societySchema);

module.exports = Society;
