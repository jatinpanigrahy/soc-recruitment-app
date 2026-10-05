/**
 * Request Validation Middleware & Schemas
 *
 * Provides a reusable validation factory powered by Joi:
 * - `validate`: Higher-order middleware factory that checks incoming request bodies against strict schemas.
 * - Auth Schemas: Predefined validation rulebooks for registration, login, profile updates, and password recovery.
 */

const joi = require("joi");

/**
 * Validation Middleware Factory
 * Validates `req.body` against a provided Joi schema.
 * Uses `abortEarly: false` to accumulate all validation discrepancies.
 * Replaces `req.body` with sanitized values on success, or responds with 400 Bad Request on failure.
 *
 * @param {joi.ObjectSchema} schema - The Joi schema checklist to enforce.
 * @returns {Function} Express middleware handler (req, res, next).
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({ success: false, message: errorMessage });
    }

    // Assign sanitized and coerced values back to req.body
    req.body = value;
    next();
  };
};

/**
 * Registration Validation Schema
 * Enforces minimal required signup fields with length and format constraints.
 */
const registerSchema = joi.object({
  username: joi.string().min(3).max(30).trim().required(),
  email: joi.string().email().trim().lowercase().required(),
  password: joi.string().min(6).required(),
});

/**
 * Login Validation Schema
 * Accepts either username or email as the login identifier along with a password.
 */
const loginSchema = joi.object({
  identifier: joi.string().trim().required(),
  password: joi.string().required(),
});

/**
 * Profile Update Validation Schema
 * Supports progressive profiling. Allows optional text fields and empty strings without validation errors.
 */
const updateProfileSchema = joi.object({
  fullName: joi.string().max(50).allow("").optional(),
  branch: joi.string().max(50).allow("").optional(),
  year: joi.string().max(20).allow("").optional(),
  avatarUrl: joi.string().uri().allow("").optional(),
});

/**
 * Forgot Password Validation Schema
 * Requires a valid email to dispatch recovery tokens.
 */
const forgotPasswordSchema = joi.object({
  email: joi.string().email().required(),
});

/**
 * Password Reset Validation Schema
 * Enforces minimum password strength requirements for account recovery.
 */
const resetPasswordSchema = joi.object({
  password: joi.string().min(6).required(),
});

/**
 * Application Submission Validation Schema
 * Validates society reference, desired role, and applicant question responses.
 */
const submitApplicationSchema = joi.object({
  societyId: joi.string().trim().required(),
  roleAppliedFor: joi.string().trim().required(),
  answers: joi
    .array()
    .items(
      joi.object({
        question: joi.string().trim().required(),
        answer: joi.string().allow("").trim().required(),
      })
    )
    .required(),
});

/**
 * Application Edit Validation Schema
 * Allows updating answers on pending applications before recruitment deadline.
 */
const editApplicationSchema = joi.object({
  answers: joi
    .array()
    .items(
      joi.object({
        question: joi.string().trim().required(),
        answer: joi.string().allow("").trim().required(),
      })
    )
    .required(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  submitApplicationSchema,
  editApplicationSchema,
};

