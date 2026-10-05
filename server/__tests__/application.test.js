const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");

const app = require("../server");
const User = require("../models/User");
const Society = require("../models/Society");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const { sendMockEmail } = require("../utils/mockEmail");
const {
  submitApplicationSchema,
  editApplicationSchema,
} = require("../middleware/validateMiddleware");

let mongoServer;
let studentUser;
let otherStudentUser;
let studentToken;
let otherStudentToken;
let openSociety;
let closedSociety;
let singleRoleSociety;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "1h",
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create test users
  studentUser = await User.create({
    username: "john_student",
    email: "john@college.edu",
    password: "Password123!",
    fullName: "John Student",
    role: "student",
  });

  otherStudentUser = await User.create({
    username: "jane_student",
    email: "jane@college.edu",
    password: "Password123!",
    fullName: "Jane Student",
    role: "student",
  });

  studentToken = generateToken(studentUser._id);
  otherStudentToken = generateToken(otherStudentUser._id);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean collections before each test run
  await Application.deleteMany({});
  await Society.deleteMany({});
  await Notification.deleteMany({});

  const now = new Date();
  const futureDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
  const pastDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const cycleStart = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  openSociety = await Society.create({
    name: "Robotics Club",
    category: "Technical",
    tagline: "Building the future of automation",
    description: "Premier robotics society",
    deadline: futureDeadline,
    recruitmentOpenedAt: cycleStart,
    allowMultipleRoles: true,
    openRoles: [
      { title: "Hardware Lead", description: "Circuits & soldering" },
      { title: "Software Lead", description: "ROS & C++" },
    ],
  });

  closedSociety = await Society.create({
    name: "Debating Society",
    category: "Literary",
    tagline: "Voice of Reason",
    description: "Parliamentary debating society",
    deadline: pastDeadline,
    recruitmentOpenedAt: cycleStart,
    allowMultipleRoles: true,
  });

  singleRoleSociety = await Society.create({
    name: "Music Society",
    category: "Cultural",
    tagline: "Sound and Harmony",
    description: "College acoustic band and orchestra",
    deadline: futureDeadline,
    recruitmentOpenedAt: cycleStart,
    allowMultipleRoles: false,
    openRoles: [
      { title: "Vocalist", description: "Lead singer" },
      { title: "Guitarist", description: "Rhythm and lead guitar" },
    ],
  });
});

describe("Application Model & Indexes", () => {
  it("should create an application with default status 'Pending' and default submittedAt", async () => {
    const appDoc = await Application.create({
      student: studentUser._id,
      society: openSociety._id,
      roleAppliedFor: "Hardware Lead",
      answers: [
        { question: "Why robotics?", answer: "Passionate about hardware." },
      ],
    });

    expect(appDoc._id).toBeDefined();
    expect(appDoc.status).toBe("Pending");
    expect(appDoc.submittedAt).toBeInstanceOf(Date);
    expect(appDoc.roleAppliedFor).toBe("Hardware Lead");
    expect(appDoc.answers).toHaveLength(1);
    expect(appDoc.answers[0].question).toBe("Why robotics?");
  });

  it("should enforce required fields in Application model", async () => {
    let error;
    try {
      await Application.create({});
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.errors.student).toBeDefined();
    expect(error.errors.society).toBeDefined();
    expect(error.errors.roleAppliedFor).toBeDefined();
  });

  it("should enforce valid status enum values", async () => {
    let error;
    try {
      await Application.create({
        student: studentUser._id,
        society: openSociety._id,
        roleAppliedFor: "Software Lead",
        status: "InvalidStatus",
      });
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  it("should define compound index on student, society, and roleAppliedFor", async () => {
    const indexes = Application.schema.indexes();
    const hasCompoundIndex = indexes.some((idx) => {
      const keys = idx[0];
      return (
        keys.student === 1 && keys.society === 1 && keys.roleAppliedFor === 1
      );
    });
    expect(hasCompoundIndex).toBe(true);
  });
});

describe("mockEmail Utility", () => {
  it("should log email details and create a corresponding Notification record", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const notification = await sendMockEmail({
      to: "test@example.com",
      subject: "Test Subject",
      body: "Test Body Message",
      userId: studentUser._id,
      relatedApplicationId: new mongoose.Types.ObjectId(),
      type: "application_submitted",
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(notification).toBeDefined();
    expect(notification.recipient.toString()).toBe(studentUser._id.toString());
    expect(notification.type).toBe("application_submitted");
    expect(notification.title).toBe("Test Subject");
    expect(notification.message).toBe("Test Body Message");

    consoleSpy.mockRestore();
  });
});

describe("Validation Schemas", () => {
  it("submitApplicationSchema should validate correct payload and reject missing fields", () => {
    const valid = submitApplicationSchema.validate({
      societyId: openSociety._id.toString(),
      roleAppliedFor: "Hardware Lead",
      answers: [{ question: "Q1", answer: "A1" }],
    });
    expect(valid.error).toBeUndefined();

    const missingRole = submitApplicationSchema.validate({
      societyId: openSociety._id.toString(),
      answers: [],
    });
    expect(missingRole.error).toBeDefined();

    const missingAnswers = submitApplicationSchema.validate({
      societyId: openSociety._id.toString(),
      roleAppliedFor: "Hardware Lead",
    });
    expect(missingAnswers.error).toBeDefined();
  });

  it("editApplicationSchema should validate correct payload and reject missing answers", () => {
    const valid = editApplicationSchema.validate({
      answers: [{ question: "Q1", answer: "Updated Answer" }],
    });
    expect(valid.error).toBeUndefined();

    const missingAnswers = editApplicationSchema.validate({});
    expect(missingAnswers.error).toBeDefined();
  });
});

describe("POST /api/applications (Submit Application)", () => {
  it("should return 401 if unauthenticated", async () => {
    const res = await request(app)
      .post("/api/applications")
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Hardware Lead",
        answers: [],
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if society does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: fakeId,
        roleAppliedFor: "Hardware Lead",
        answers: [],
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Society not found");
  });

  it("should return 400 'Recruitment is closed' if society deadline has passed", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: closedSociety._id.toString(),
        roleAppliedFor: "Debater",
        answers: [],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Recruitment is closed");
  });

  it("should successfully submit application (201) and create notification", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Hardware Lead",
        answers: [{ question: "Why apply?", answer: "Passionate about robotics" }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roleAppliedFor).toBe("Hardware Lead");
    expect(res.body.data.status).toBe("Pending");

    // Verify Notification record was created
    const notification = await Notification.findOne({
      recipient: studentUser._id,
      relatedApplication: res.body.data._id,
    });
    expect(notification).toBeDefined();
    expect(notification.type).toBe("application_submitted");
  });

  it("should enforce Open Window Rule: return 400 if already applied to this role in current cycle", async () => {
    // First submission
    await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Hardware Lead",
        answers: [{ question: "Q1", answer: "A1" }],
      });

    // Duplicate submission in the same recruitment cycle
    const duplicateRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Hardware Lead",
        answers: [{ question: "Q1", answer: "A2" }],
      });

    expect(duplicateRes.statusCode).toBe(400);
    expect(duplicateRes.body.message).toBe(
      "You have already applied to this role in the current recruitment cycle"
    );
  });

  it("should enforce 90-day fallback when recruitmentOpenedAt is undefined: permit re-application after 90 days", async () => {
    // Create society without recruitmentOpenedAt
    const societyNoWindow = await Society.create({
      name: "Astronomy Club",
      category: "Technical",
      tagline: "Reach for the stars",
      description: "Stargazing and space tech",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      allowMultipleRoles: true,
      openRoles: [{ title: "Telescope Operator" }],
    });

    // Create an old application from 100 days ago
    await Application.create({
      student: studentUser._id,
      society: societyNoWindow._id,
      roleAppliedFor: "Telescope Operator",
      answers: [],
      submittedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    });

    // Submitting today should succeed because 100 days > 90 days fallback window
    const newRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: societyNoWindow._id.toString(),
        roleAppliedFor: "Telescope Operator",
        answers: [],
      });

    expect(newRes.statusCode).toBe(201);
    expect(newRes.body.success).toBe(true);
  });

  it("should enforce 90-day fallback when recruitmentOpenedAt is undefined: block duplicate within 90 days", async () => {
    // Create society without recruitmentOpenedAt
    const societyNoWindow = await Society.create({
      name: "Drama Club",
      category: "Cultural",
      tagline: "Stage & Theatre",
      description: "College theatre society",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      allowMultipleRoles: true,
      openRoles: [{ title: "Actor" }],
    });

    // Create an application from 30 days ago (< 90 days)
    await Application.create({
      student: studentUser._id,
      society: societyNoWindow._id,
      roleAppliedFor: "Actor",
      answers: [],
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    // Submitting today should be blocked by 90-day fallback
    const newRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: societyNoWindow._id.toString(),
        roleAppliedFor: "Actor",
        answers: [],
      });

    expect(newRes.statusCode).toBe(400);
    expect(newRes.body.message).toBe(
      "You have already applied to this role in the current recruitment cycle"
    );
  });

  it("should allow applying to different roles when allowMultipleRoles is true", async () => {
    // Apply to Hardware Lead
    const firstRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Hardware Lead",
        answers: [],
      });
    expect(firstRes.statusCode).toBe(201);

    // Apply to Software Lead in the same society
    const secondRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: openSociety._id.toString(),
        roleAppliedFor: "Software Lead",
        answers: [],
      });
    expect(secondRes.statusCode).toBe(201);
  });

  it("should enforce multi-role toggle: return 400 if allowMultipleRoles is false and already applied", async () => {
    // Apply to Vocalist
    const firstRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: singleRoleSociety._id.toString(),
        roleAppliedFor: "Vocalist",
        answers: [],
      });
    expect(firstRes.statusCode).toBe(201);

    // Attempt to apply to Guitarist in single-role society
    const secondRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        societyId: singleRoleSociety._id.toString(),
        roleAppliedFor: "Guitarist",
        answers: [],
      });

    expect(secondRes.statusCode).toBe(400);
    expect(secondRes.body.message).toBe(
      "This society only allows one application per cycle"
    );
  });
});

describe("GET /api/applications/my (Get My Applications)", () => {
  it("should return 401 if unauthenticated", async () => {
    const res = await request(app).get("/api/applications/my");
    expect(res.statusCode).toBe(401);
  });

  it("should return applications submitted by current user with populated society branding", async () => {
    // Submit application for studentUser
    await Application.create({
      student: studentUser._id,
      society: openSociety._id,
      roleAppliedFor: "Hardware Lead",
      answers: [{ question: "Q1", answer: "A1" }],
    });

    // Submit application for otherStudentUser
    await Application.create({
      student: otherStudentUser._id,
      society: openSociety._id,
      roleAppliedFor: "Software Lead",
      answers: [],
    });

    const res = await request(app)
      .get("/api/applications/my")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].roleAppliedFor).toBe("Hardware Lead");
    expect(res.body.data[0].society).toBeDefined();
    expect(res.body.data[0].society.name).toBe("Robotics Club");
    expect(res.body.data[0].society.logoUrl).toBeDefined();
  });
});

describe("PATCH /api/applications/:id (Edit Application)", () => {
  let pendingApp;

  beforeEach(async () => {
    pendingApp = await Application.create({
      student: studentUser._id,
      society: openSociety._id,
      roleAppliedFor: "Hardware Lead",
      answers: [{ question: "Original Question", answer: "Original Answer" }],
      status: "Pending",
    });
  });

  it("should return 401 if unauthenticated", async () => {
    const res = await request(app)
      .patch(`/api/applications/${pendingApp._id}`)
      .send({
        answers: [{ question: "Updated Question", answer: "Updated Answer" }],
      });
    expect(res.statusCode).toBe(401);
  });

  it("should return 404 if application not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/applications/${fakeId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        answers: [{ question: "Updated Question", answer: "Updated Answer" }],
      });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Application not found");
  });

  it("should return 403 if another user attempts to edit the application", async () => {
    const res = await request(app)
      .patch(`/api/applications/${pendingApp._id}`)
      .set("Authorization", `Bearer ${otherStudentToken}`)
      .send({
        answers: [{ question: "Updated Question", answer: "Hacked Answer" }],
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe("Not authorized to modify this application");
  });

  it("should return 400 'Recruitment is closed' if society deadline has passed", async () => {
    const closedApp = await Application.create({
      student: studentUser._id,
      society: closedSociety._id,
      roleAppliedFor: "Debater",
      status: "Pending",
      answers: [],
    });

    const res = await request(app)
      .patch(`/api/applications/${closedApp._id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        answers: [{ question: "Updated Question", answer: "Late Answer" }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Recruitment is closed");
  });

  it("should return 400 if application status is no longer 'Pending'", async () => {
    pendingApp.status = "Shortlisted";
    await pendingApp.save();

    const res = await request(app)
      .patch(`/api/applications/${pendingApp._id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        answers: [{ question: "Updated Question", answer: "Updated Answer" }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Cannot edit an application that is no longer pending"
    );
  });

  it("should successfully update answers for a pending application", async () => {
    const res = await request(app)
      .patch(`/api/applications/${pendingApp._id}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        answers: [
          { question: "Original Question", answer: "Refined & Polished Answer" },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answers[0].answer).toBe("Refined & Polished Answer");

    const refreshed = await Application.findById(pendingApp._id);
    expect(refreshed.answers[0].answer).toBe("Refined & Polished Answer");
  });
});
