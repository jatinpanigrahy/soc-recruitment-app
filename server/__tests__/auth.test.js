/**
 * Authentication Test Suite
 *
 * Tests the complete authentication and progressive profiling lifecycle:
 * - Registration (POST /api/auth/register)
 * - Login (POST /api/auth/login)
 * - Current User Profile (GET /api/auth/me)
 * - Profile Updates / Progressive Profiling (PATCH /api/auth/profile)
 * - Password Recovery Flow (POST /api/auth/forgot-password)
 * - Cryptographic Password Reset (POST /api/auth/reset-password/:token)
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");

const app = require("../server");
const User = require("../models/User");
const Society = require("../models/Society");
const Notification = require("../models/Notification");

let mongoServer;

/**
 * Helper to generate a test JWT Bearer token
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} [role="student"]
 * @returns {string} signed JWT
 */
const generateToken = (userId, role = "student") => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "7d" }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Society.deleteMany({});
  await Notification.deleteMany({});
});

describe("Authentication Test Suite (/api/auth)", () => {
  // ==========================================
  // POST /api/auth/register
  // ==========================================
  describe("POST /api/auth/register (User Registration)", () => {
    it("should successfully register a new user with minimal credentials and return 201", async () => {
      const payload = {
        username: "johndoe",
        email: "johndoe@college.edu",
        password: "Password123!",
      };

      const res = await request(app)
        .post("/api/auth/register")
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user).toMatchObject({
        username: "johndoe",
        email: "johndoe@college.edu",
        role: "student",
      });
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.password).toBeUndefined();

      // Ensure user was persisted to database with hashed password
      const savedUser = await User.findById(res.body.user.id);
      expect(savedUser).not.toBeNull();
      expect(savedUser.password).not.toBe(payload.password);

      // Verify welcoming profile-incomplete notification was generated
      const welcomeNotification = await Notification.findOne({
        recipient: savedUser._id,
        type: "profile_incomplete",
      });
      expect(welcomeNotification).not.toBeNull();
      expect(welcomeNotification.title).toBe("Welcome to Pulse!");
    });

    it("should reject registration if email is already taken", async () => {
      await User.create({
        username: "existinguser",
        email: "taken@college.edu",
        password: "Password123!",
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "differentuser",
          email: "taken@college.edu",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/user already exists/i);
    });

    it("should reject registration if username is already taken", async () => {
      await User.create({
        username: "uniqueuser",
        email: "first@college.edu",
        password: "Password123!",
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "uniqueuser",
          email: "second@college.edu",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/user already exists/i);
    });

    it("should reject registration with missing username, email, or password", async () => {
      const resMissingUsername = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@college.edu",
          password: "Password123!",
        });
      expect(resMissingUsername.statusCode).toBe(400);
      expect(resMissingUsername.body.success).toBe(false);

      const resMissingEmail = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testuser",
          password: "Password123!",
        });
      expect(resMissingEmail.statusCode).toBe(400);
      expect(resMissingEmail.body.success).toBe(false);

      const resMissingPassword = await request(app)
        .post("/api/auth/register")
        .send({
          username: "testuser",
          email: "test@college.edu",
        });
      expect(resMissingPassword.statusCode).toBe(400);
      expect(resMissingPassword.body.success).toBe(false);
    });

    it("should reject registration with invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "validuser",
          email: "not-an-email-address",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with username under 3 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "ab",
          email: "shortuser@college.edu",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject registration with password shorter than 6 characters", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "validuser",
          email: "valid@college.edu",
          password: "12345",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/auth/login
  // ==========================================
  describe("POST /api/auth/login (User Login)", () => {
    beforeEach(async () => {
      await User.create({
        username: "loginuser",
        email: "login@college.edu",
        password: "Password123!",
      });
    });

    it("should log in successfully using email as identifier", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "login@college.edu",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        username: "loginuser",
        email: "login@college.edu",
        role: "student",
      });
      expect(res.body.user.password).toBeUndefined();
    });

    it("should log in successfully using username as identifier", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "loginuser",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({
        username: "loginuser",
        email: "login@college.edu",
        role: "student",
      });
    });

    it("should reject login when password does not match", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "login@college.edu",
          password: "IncorrectPassword!",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it("should reject login for non-existent identifier", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "nonexistent@college.edu",
          password: "Password123!",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it("should reject login when identifier or password is missing", async () => {
      const resNoId = await request(app)
        .post("/api/auth/login")
        .send({ password: "Password123!" });
      expect(resNoId.statusCode).toBe(400);
      expect(resNoId.body.success).toBe(false);

      const resNoPass = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "loginuser" });
      expect(resNoPass.statusCode).toBe(400);
      expect(resNoPass.body.success).toBe(false);
    });
  });

  // ==========================================
  // GET /api/auth/me
  // ==========================================
  describe("GET /api/auth/me (Get Current Profile)", () => {
    it("should return profile of logged-in student user without password", async () => {
      const user = await User.create({
        username: "student_me",
        email: "me@college.edu",
        password: "Password123!",
        fullName: "Student Me",
        branch: "Computer Science",
        year: "2nd Year",
      });
      const token = generateToken(user._id, "student");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user._id.toString()).toBe(user._id.toString());
      expect(res.body.user.username).toBe("student_me");
      expect(res.body.user.email).toBe("me@college.edu");
      expect(res.body.user.fullName).toBe("Student Me");
      expect(res.body.user.branch).toBe("Computer Science");
      expect(res.body.user.year).toBe("2nd Year");
      expect(res.body.user.password).toBeUndefined();
    });

    it("should populate managedSocieties for a society_admin user", async () => {
      const society = await Society.create({
        name: "Robotics League",
        category: "Technical",
        tagline: "Innovate and build",
        description: "Robotics club",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const adminUser = await User.create({
        username: "admin_lead",
        email: "lead@college.edu",
        password: "Password123!",
        role: "society_admin",
        managedSocieties: [society._id],
      });
      const token = generateToken(adminUser._id, "society_admin");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.user.managedSocieties)).toBe(true);
      expect(res.body.user.managedSocieties).toHaveLength(1);
      expect(res.body.user.managedSocieties[0].name).toBe("Robotics League");
      expect(res.body.user.managedSocieties[0].category).toBe("Technical");
    });

    it("should return 401 when Authorization header is omitted", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no token/i);
    });

    it("should return 401 when an invalid JWT token is supplied", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.signature");

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token invalid/i);
    });

    it("should return 401 if user encoded in token no longer exists", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const ghostToken = generateToken(nonExistentId);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${ghostToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/user not found/i);
    });
  });

  // ==========================================
  // PATCH /api/auth/profile
  // ==========================================
  describe("PATCH /api/auth/profile (Update Profile / Progressive Profiling)", () => {
    let studentUser;
    let studentToken;

    beforeEach(async () => {
      studentUser = await User.create({
        username: "profiler",
        email: "profiler@college.edu",
        password: "Password123!",
      });
      studentToken = generateToken(studentUser._id);
    });

    it("should update profile fields successfully and return updated user object", async () => {
      const updateData = {
        fullName: "Alex Mercer",
        branch: "Mechanical Engineering",
        year: "3rd Year",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const res = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Profile updated");
      expect(res.body.user).toMatchObject({
        fullName: "Alex Mercer",
        branch: "Mechanical Engineering",
        year: "3rd Year",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(res.body.user.password).toBeUndefined();

      // Verify database persistence
      const freshUser = await User.findById(studentUser._id);
      expect(freshUser.fullName).toBe("Alex Mercer");
      expect(freshUser.branch).toBe("Mechanical Engineering");
    });

    it("should allow partial profile updates without clearing other fields", async () => {
      // First update
      await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          fullName: "Jane Doe",
          branch: "Electrical Engineering",
        });

      // Partial update only changing year
      const res = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          year: "4th Year",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.year).toBe("4th Year");
    });

    it("should accept empty string values for optional profile attributes", async () => {
      const res = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          fullName: "",
          branch: "",
          year: "",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject profile update when unauthenticated", async () => {
      const res = await request(app)
        .patch("/api/auth/profile")
        .send({ fullName: "Ghost Writer" });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject update if avatarUrl is not a valid URI", async () => {
      const res = await request(app)
        .patch("/api/auth/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ avatarUrl: "invalid-url-format" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/auth/forgot-password
  // ==========================================
  describe("POST /api/auth/forgot-password (Forgot Password Request)", () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        username: "forgotuser",
        email: "forgot@college.edu",
        password: "Password123!",
      });
    });

    it("should generate a reset token and return 200 for registered email", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "forgot@college.edu" });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Email sent");

      // Verify token and expiration timestamp in database
      const userInDb = await User.findById(testUser._id);
      expect(userInDb.resetPasswordToken).toBeDefined();
      expect(typeof userInDb.resetPasswordToken).toBe("string");
      expect(userInDb.resetPasswordToken).toHaveLength(64); // SHA-256 hex string length
      expect(userInDb.resetPasswordExpire).toBeDefined();
      expect(new Date(userInDb.resetPasswordExpire).getTime()).toBeGreaterThan(Date.now());
    });

    it("should return 404 if email does not exist", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@college.edu" });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/user not found/i);
    });

    it("should return 400 when email format is invalid or missing", async () => {
      const resInvalid = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(resInvalid.statusCode).toBe(400);
      expect(resInvalid.body.success).toBe(false);

      const resMissing = await request(app)
        .post("/api/auth/forgot-password")
        .send({});

      expect(resMissing.statusCode).toBe(400);
      expect(resMissing.body.success).toBe(false);
    });
  });

  // ==========================================
  // POST /api/auth/reset-password/:token
  // ==========================================
  describe("POST /api/auth/reset-password/:token (Reset Password Flow)", () => {
    let resetUser;
    let rawToken;

    beforeEach(async () => {
      rawToken = crypto.randomBytes(20).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      resetUser = await User.create({
        username: "resetuser",
        email: "reset@college.edu",
        password: "OriginalPassword123!",
        resetPasswordToken: hashedToken,
        resetPasswordExpire: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
      });
    });

    it("should reset password successfully, clear reset fields, and allow login with new password", async () => {
      const newPassword = "BrandNewPassword123!";

      const res = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ password: newPassword });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.message).toBe("Password reset successful");

      // Verify reset token fields were cleared in DB
      const updatedUser = await User.findById(resetUser._id);
      expect(updatedUser.resetPasswordToken).toBeUndefined();
      expect(updatedUser.resetPasswordExpire).toBeUndefined();

      // Verify login succeeds with the NEW password
      const loginSuccess = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "reset@college.edu",
          password: newPassword,
        });
      expect(loginSuccess.statusCode).toBe(200);
      expect(loginSuccess.body.success).toBe(true);

      // Verify login fails with the OLD password
      const loginFail = await request(app)
        .post("/api/auth/login")
        .send({
          identifier: "reset@college.edu",
          password: "OriginalPassword123!",
        });
      expect(loginFail.statusCode).toBe(401);
      expect(loginFail.body.success).toBe(false);
    });

    it("should reject reset with an invalid or manipulated token", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password/bogusInvalidToken123")
        .send({ password: "BrandNewPassword123!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired token/i);
    });

    it("should reject reset when token has already expired", async () => {
      // Fast-forward expiration into the past
      await User.findByIdAndUpdate(resetUser._id, {
        resetPasswordExpire: Date.now() - 1000,
      });

      const res = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ password: "BrandNewPassword123!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired token/i);
    });

    it("should reject reset when new password is shorter than 6 characters", async () => {
      const res = await request(app)
        .post(`/api/auth/reset-password/${rawToken}`)
        .send({ password: "123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
