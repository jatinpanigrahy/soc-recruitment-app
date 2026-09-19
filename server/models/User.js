/**
 * User Model
 *
 * Defines the schema, validation, and security methods for all users on the platform.
 * Supports progressive registration (minimal required fields upfront, profile completed later).
 * Handles authentication via bcrypt password hashing.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Minimal registration fields
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    
    // Progressive profile fields (filled later)
    fullName: {
      type: String,
      trim: true,
      // Note: Not required. The app falls back to 'username' if this is empty.
    },
    avatarUrl: {
      type: String, // Stores Cloudinary image URL
    },
    branch: {
      type: String,
      trim: true,
    },
    year: {
      type: String,
      trim: true,
    },

    // Role-based access control and multi-tenancy
    role: {
      type: String,
      enum: ["student", "society_admin", "super_admin"],
      default: "student",
    },
    managedSocieties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Society", // The "keychain" of clubs this admin is allowed to manage
      },
    ],

    // Password recovery fields
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  { 
    // Automatically manages createdAt and updatedAt
    timestamps: true 
  },
);

/**
 * Pre-save Hook: Password Security
 * Automatically scrambles (hashes) the password before saving to the database.
 * Only runs if the password field was actually modified, saving CPU cycles.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  
  // Generate a random salt (10 rounds) and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Instance Method: Verify Password
 * Compares a plain text password (from a login form) against the hashed password in the database.
 * @param {string} enteredPassword - The password typed by the user
 * @returns {boolean} - True if passwords match, False otherwise
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compile and export the User model
const User = mongoose.model("User", userSchema);
module.exports = User;
