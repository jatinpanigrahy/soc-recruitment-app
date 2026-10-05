const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");

const app = require("../server");
const User = require("../models/User");
const Society = require("../models/Society");
const Application = require("../models/Application");
const Notification = require("../models/Notification");

let mongoServer;
let studentUser, societyAdminUser, unauthorizedAdminUser, superAdminUser;
let studentToken, societyAdminToken, unauthorizedAdminToken, superAdminToken;
let societyA, societyB;
let applicationA;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "1h",
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed societies
  societyA = await Society.create({
    name: "Tech Innovators",
    category: "Technical",
    tagline: "Building tomorrow",
    description: "Hub for modern builders and thinkers.",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    recruitmentOpenedAt: new Date(),
    openRoles: [
      {
        title: "Frontend Engineer",
        description: "React development",
        requirements: "JavaScript, HTML, CSS",
        questions: ["What is your favorite CSS library?"],
      },
    ],
    generalQuestions: ["Why join Tech Innovators?"],
  });

  societyB = await Society.create({
    name: "Literary Guild",
    category: "Literary",
    tagline: "Words matter",
    description: "Society for writers and orators.",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    recruitmentOpenedAt: new Date(),
    openRoles: [
      {
        title: "Content Writer",
        description: "Articles and copy",
        requirements: "Strong writing skills",
        questions: ["Share your best article."],
      },
    ],
    generalQuestions: ["Why join Literary Guild?"],
  });

  // Seed users
  studentUser = await User.create({
    username: "alex_student",
    email: "alex@college.edu",
    password: "Password123!",
    fullName: "Alex Student",
    role: "student",
  });

  societyAdminUser = await User.create({
    username: "sarah_admin",
    email: "sarah@college.edu",
    password: "Password123!",
    fullName: "Sarah Admin",
    role: "society_admin",
    managedSocieties: [societyA._id],
  });

  unauthorizedAdminUser = await User.create({
    username: "bob_admin",
    email: "bob@college.edu",
    password: "Password123!",
    fullName: "Bob Admin",
    role: "society_admin",
    managedSocieties: [societyB._id],
  });

  superAdminUser = await User.create({
    username: "system_admin",
    email: "super@college.edu",
    password: "Password123!",
    fullName: "Root Admin",
    role: "super_admin",
  });

  studentToken = generateToken(studentUser._id);
  societyAdminToken = generateToken(societyAdminUser._id);
  unauthorizedAdminToken = generateToken(unauthorizedAdminUser._id);
  superAdminToken = generateToken(superAdminUser._id);

  // Seed application
  applicationA = await Application.create({
    student: studentUser._id,
    society: societyA._id,
    roleAppliedFor: "Frontend Engineer",
    answers: [{ question: "Why join Tech Innovators?", answer: "Because I love building." }],
    status: "Pending",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Admin Controller & Routes (/api/admin)", () => {
  describe("GET /api/admin/societies/:societyId/applications (getApplicants)", () => {
    it("should reject student users with 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/admin/societies/${societyA._id}/applications`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(403);
    });

    it("should reject society_admin when society is not in managedSocieties (Keychain Guard)", async () => {
      const res = await request(app)
        .get(`/api/admin/societies/${societyA._id}/applications`)
        .set("Authorization", `Bearer ${unauthorizedAdminToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it("should allow society_admin when society is in managedSocieties", async () => {
      const res = await request(app)
        .get(`/api/admin/societies/${societyA._id}/applications`)
        .set("Authorization", `Bearer ${societyAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].roleAppliedFor).toBe("Frontend Engineer");
    });

    it("should allow super_admin to access applications for any society", async () => {
      const res = await request(app)
        .get(`/api/admin/societies/${societyA._id}/applications`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe("PATCH /api/admin/applications/:id/status (updateStatus)", () => {
    it("should reject unmanaged society admin with 403 (Keychain Guard)", async () => {
      const res = await request(app)
        .patch(`/api/admin/applications/${applicationA._id}/status`)
        .set("Authorization", `Bearer ${unauthorizedAdminToken}`)
        .send({ status: "Shortlisted" });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should successfully update status, set feedbackNote, and trigger notification/mock email", async () => {
      const res = await request(app)
        .patch(`/api/admin/applications/${applicationA._id}/status`)
        .set("Authorization", `Bearer ${societyAdminToken}`)
        .send({
          status: "Shortlisted",
          feedbackNote: "Great portfolio submission!",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("Shortlisted");
      expect(res.body.data.feedbackNote).toBe("Great portfolio submission!");

      // Verify in-app notification was dispatched to applicant
      const notif = await Notification.findOne({
        recipient: studentUser._id,
        type: "status_changed",
      });
      expect(notif).toBeDefined();
      expect(notif.title).toContain("Application Status Updated");
      expect(notif.message).toContain("Shortlisted");
    });

    it("should return 400 for invalid status enum", async () => {
      const res = await request(app)
        .patch(`/api/admin/applications/${applicationA._id}/status`)
        .set("Authorization", `Bearer ${societyAdminToken}`)
        .send({ status: "InvalidStatus" });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/admin/societies/:societyId/questions (updateQuestions)", () => {
    it("should reject unmanaged society admin with 403", async () => {
      const res = await request(app)
        .patch(`/api/admin/societies/${societyA._id}/questions`)
        .set("Authorization", `Bearer ${unauthorizedAdminToken}`)
        .send({ generalQuestions: ["New Question?"] });

      expect(res.statusCode).toBe(403);
    });

    it("should update general and role-specific questions for authorized admin", async () => {
      const res = await request(app)
        .patch(`/api/admin/societies/${societyA._id}/questions`)
        .set("Authorization", `Bearer ${societyAdminToken}`)
        .send({
          generalQuestions: ["Updated general question 1", "Updated general question 2"],
          roleQuestions: [
            {
              roleTitle: "Frontend Engineer",
              questions: ["Have you used TypeScript?"],
            },
          ],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generalQuestions).toEqual([
        "Updated general question 1",
        "Updated general question 2",
      ]);
      expect(res.body.data.openRoles[0].questions).toEqual(["Have you used TypeScript?"]);
    });
  });

  describe("PATCH /api/admin/societies/:societyId/recruitment (toggleRecruitment)", () => {
    it("should toggle recruitment open/close state", async () => {
      // Close recruitment
      const closeRes = await request(app)
        .patch(`/api/admin/societies/${societyA._id}/recruitment`)
        .set("Authorization", `Bearer ${societyAdminToken}`)
        .send({ isOpen: false });

      expect(closeRes.statusCode).toBe(200);
      expect(closeRes.body.success).toBe(true);
      expect(new Date(closeRes.body.data.deadline).getTime()).toBeLessThan(Date.now());

      // Open recruitment
      const openRes = await request(app)
        .patch(`/api/admin/societies/${societyA._id}/recruitment`)
        .set("Authorization", `Bearer ${societyAdminToken}`)
        .send({ isOpen: true });

      expect(openRes.statusCode).toBe(200);
      expect(openRes.body.success).toBe(true);
      expect(new Date(openRes.body.data.deadline).getTime()).toBeGreaterThan(Date.now());
    });
  });
});

describe("Super Admin Controller & Routes (/api/super-admin)", () => {
  let createdSocietyId;

  it("should reject non-super_admin from accessing super admin routes", async () => {
    const res = await request(app)
      .get("/api/super-admin/users")
      .set("Authorization", `Bearer ${societyAdminToken}`);

    expect(res.statusCode).toBe(403);
  });

  describe("POST /api/super-admin/societies (createSociety)", () => {
    it("should create a new society", async () => {
      const res = await request(app)
        .post("/api/super-admin/societies")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Robotics & AI Guild",
          category: "Technical",
          tagline: "Autonomous futures",
          description: "Designing intelligent hardware and software systems.",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Robotics & AI Guild");
      createdSocietyId = res.body.data._id;
    });

    it("should reject duplicate society name with 400", async () => {
      const res = await request(app)
        .post("/api/super-admin/societies")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Robotics & AI Guild",
          category: "Technical",
          tagline: "Autonomous futures",
          description: "Duplicate test.",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/super-admin/societies/:id/archive (archiveSociety)", () => {
    it("should toggle isArchived flag", async () => {
      const archiveRes = await request(app)
        .patch(`/api/super-admin/societies/${createdSocietyId}/archive`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(archiveRes.statusCode).toBe(200);
      expect(archiveRes.body.data.isArchived).toBe(true);

      const unarchiveRes = await request(app)
        .patch(`/api/super-admin/societies/${createdSocietyId}/archive`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(unarchiveRes.statusCode).toBe(200);
      expect(unarchiveRes.body.data.isArchived).toBe(false);
    });
  });

  describe("PATCH /api/super-admin/users/:id/promote (promoteUser)", () => {
    it("should promote student to society_admin and assign managedSocieties", async () => {
      const res = await request(app)
        .patch(`/api/super-admin/users/${studentUser._id}/promote`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          role: "society_admin",
          managedSocieties: [createdSocietyId],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("society_admin");

      // Verify admin_assigned notification
      const notif = await Notification.findOne({
        recipient: studentUser._id,
        type: "admin_assigned",
      });
      expect(notif).toBeDefined();
    });
  });

  describe("GET /api/super-admin/users (listUsers)", () => {
    it("should list all registered users", async () => {
      const res = await request(app)
        .get("/api/super-admin/users")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("GET /api/super-admin/analytics (analytics)", () => {
    it("should aggregate system recruitment analytics", async () => {
      const res = await request(app)
        .get("/api/super-admin/analytics")
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalApplicants");
      expect(res.body.data).toHaveProperty("totalUsers");
      expect(res.body.data).toHaveProperty("totalSocieties");
      expect(res.body.data).toHaveProperty("perSocietyCounts");
      expect(res.body.data).toHaveProperty("statusBreakdown");
      expect(res.body.data.statusBreakdown).toHaveProperty("Shortlisted");
    });
  });
});

describe("Notification Controller & Routes (/api/notifications)", () => {
  let testNotif;

  beforeAll(async () => {
    testNotif = await Notification.create({
      recipient: studentUser._id,
      type: "other",
      title: "Welcome to Pulse",
      message: "Your journey starts here.",
      read: false,
    });
  });

  it("should get all notifications for authenticated user with unreadCount", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("should mark a single notification as read", async () => {
    const res = await request(app)
      .patch(`/api/notifications/${testNotif._id}/read`)
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.read).toBe(true);
  });

  it("should bulk mark all notifications as read", async () => {
    // Create another unread notification
    await Notification.create({
      recipient: studentUser._id,
      type: "other",
      title: "Second Notice",
      message: "Unread message",
      read: false,
    });

    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const unreadCount = await Notification.countDocuments({
      recipient: studentUser._id,
      read: false,
    });
    expect(unreadCount).toBe(0);
  });
});
