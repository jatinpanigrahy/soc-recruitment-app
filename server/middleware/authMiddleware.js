/**
 * Authentication & Authorization Middleware
 *
 * Provides route protection guards:
 * - `protect`: Verifies incoming JWT Bearer tokens and attaches the authenticated user to `req.user`.
 * - `authorize`: Enforces Role-Based Access Control (RBAC) across student, society_admin, and super_admin tiers.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect Middleware
 * Validates the JWT Bearer token in the Authorization header.
 * Denies access with 401 Unauthorized if the token is missing, expired, or invalid.
 */
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Block request if no token was provided
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }

  try {
    // Verify token signature against server secret
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    );

    // Fetch user from database, omitting password hash
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Token valid and user verified: proceed to next middleware or controller
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token invalid" });
  }
};

/**
 * Authorize Middleware Factory
 * Enforces Role-Based Access Control (RBAC).
 * Accepts any number of allowed roles (e.g. authorize('society_admin', 'super_admin')).
 * Denies access with 403 Forbidden if the user's role is not permitted.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
