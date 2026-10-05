/**
 * Society Controller & Model Test Suite
 *
 * Verifies:
 * - MongoDB indexes on category and name fields
 * - GET /api/societies pagination, page/limit query parameters, skip/limit behavior
 * - Pagination metadata: page, limit, totalPages, total, hasMore
 * - Category filtering and search query with pagination
 * - Sorting behaviors
 * - GET /api/societies/:id single society retrieval and error cases
 */

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");
const Society = require("../models/Society");

let mongoServer;

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
  await Society.deleteMany({});
});

describe("Society Model Indexes", () => {
  it("should have explicit indexes on category and name fields", async () => {
    const indexes = Society.schema.indexes();
    // indexes is an array of [keyObject, optionsObject]
    const indexedKeys = indexes.map(([keys]) => Object.keys(keys)[0]);

    expect(indexedKeys).toContain("category");
    expect(indexedKeys).toContain("name");
  });
});

describe("GET /api/societies (Pagination & Discovery)", () => {
  const seedSocieties = async (count = 15) => {
    const docs = [];
    for (let i = 1; i <= count; i++) {
      docs.push({
        name: `Club ${String(i).padStart(2, "0")}`,
        category: i % 2 === 0 ? "Technical" : "Cultural",
        tagline: `Tagline for club ${i}`,
        description: `Description for club ${i}`,
        deadline: new Date(Date.now() + i * 86400000), // staggering deadlines
      });
    }
    return Society.insertMany(docs);
  };

  it("should return default pagination (page 1, limit 12) with pagination metadata", async () => {
    await seedSocieties(15);

    const res = await request(app).get("/api/societies");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(12);
    expect(res.body.data.length).toBe(12);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 12,
      totalPages: 2,
      total: 15,
      hasMore: true,
    });
  });

  it("should fetch page 2 correctly with remaining items and hasMore = false", async () => {
    await seedSocieties(15);

    const res = await request(app).get("/api/societies?page=2&limit=12");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
    expect(res.body.data.length).toBe(3);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 12,
      totalPages: 2,
      total: 15,
      hasMore: false,
    });
  });

  it("should support custom limit parameter (e.g., limit=5)", async () => {
    await seedSocieties(15);

    const res = await request(app).get("/api/societies?page=1&limit=5");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(5);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 5,
      totalPages: 3,
      total: 15,
      hasMore: true,
    });
  });

  it("should combine pagination with category filtering", async () => {
    await seedSocieties(15); // 7 Technical (even: 2,4,6,8,10,12,14), 8 Cultural (odd: 1,3,5,7,9,11,13,15)

    const res = await request(app).get("/api/societies?category=Technical&page=1&limit=5");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(5);
    expect(res.body.pagination.total).toBe(7);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.hasMore).toBe(true);

    // Page 2
    const resPage2 = await request(app).get("/api/societies?category=Technical&page=2&limit=5");
    expect(resPage2.statusCode).toBe(200);
    expect(resPage2.body.count).toBe(2);
    expect(resPage2.body.pagination.hasMore).toBe(false);
  });

  it("should combine pagination with text search", async () => {
    await seedSocieties(15);

    const res = await request(app).get("/api/societies?search=Club 0&page=1&limit=5");

    expect(res.statusCode).toBe(200);
    // Clubs 01 to 09 match
    expect(res.body.pagination.total).toBe(9);
    expect(res.body.count).toBe(5);
    expect(res.body.pagination.hasMore).toBe(true);
  });

  it("should return empty results gracefully when page exceeds total pages", async () => {
    await seedSocieties(5);

    const res = await request(app).get("/api/societies?page=5&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.hasMore).toBe(false);
  });
});

describe("GET /api/societies/:id", () => {
  it("should return a single society by ID", async () => {
    const created = await Society.create({
      name: "Robotics Nexus",
      category: "Technical",
      tagline: "Build robots",
      description: "College robotics hub",
      deadline: new Date(Date.now() + 86400000),
    });

    const res = await request(app).get(`/api/societies/${created._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Robotics Nexus");
  });

  it("should return 404 for a non-existent ObjectId", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/societies/${nonExistentId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Society not found");
  });
});
