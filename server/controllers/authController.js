/**
 * Authentication Controller
 *
 * Handles user registration, login, profile retrieval, progressive profiling updates,
 * and secure cryptographic password recovery flows.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * Generates a signed JSON Web Token (JWT) stamped with user ID and role.
 * Valid for 7 days.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "7d",
  });
};

/**
 * Register User
 * Route: POST /api/auth/register
 * Supports progressive registration (minimal required fields: username, email, password).
 * Automatically dispatches a welcoming profile-completion reminder notification.
 */
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verify username and email uniqueness
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Create user (password is automatically hashed via pre-save hook in User model)
    const user = await User.create({ username, email, password });
    const token = generateToken(user._id, user.role);

    // Create a gentle welcome notification nudging profile completion
    await Notification.create({
      recipient: user._id,
      type: "profile_incomplete",
      title: "Welcome to Pulse!",
      message:
        "Complete your profile with your full name, branch, and year for a smoother application experience.",
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Login User
 * Route: POST /api/auth/login
 * Supports authentication via either email OR username.
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Locate user by either email or username
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Verify password against stored bcrypt hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT wristband token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Current Logged-in User Profile
 * Route: GET /api/auth/me
 * Protected by auth middleware; returns user profile without password.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("managedSocieties", "name logoUrl category deadline recruitmentOpenedAt openRoles generalQuestions");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update Profile (Progressive Profiling)
 * Route: PATCH /api/auth/profile
 * Allows users to update individual or multiple profile fields independently.
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, branch, year, avatarUrl } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, branch, year, avatarUrl },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Forgot Password
 * Route: POST /api/auth/forgot-password
 * Generates a single-use crypto token, hashes it for database storage,
 * and builds a password reset URL valid for 10 minutes.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Guard against non-existent accounts
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Generate random 20-byte token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and store on user with 10-minute expiry
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Construct reset URL using environment-aware client URL
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
    console.log(`Password reset URL: ${resetUrl}`);

    res.status(200).json({ success: true, message: "Email sent" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Reset Password
 * Route: POST /api/auth/reset-password/:token
 * Validates token against database hash and expiration, updates password,
 * and issues a fresh session token.
 */
const resetPassword = async (req, res) => {
  try {
    // Hash incoming URL token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // Set new password (pre-save hook will hash it automatically)
    user.password = req.body.password;

    // Erase token fields from database
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Issue fresh JWT token for immediate login
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
};
