const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Task 6: Dynamic Restaurant Recommendation System Tests", () => {
    it("should return ranked restaurant recommendations with match scores", async () => {
        const loginRes = await request(app).post("/api/auth/login").send({
            email: process.env.SEED_CUSTOMER_EMAIL || "customer@zingbite.com",
            password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
        });
        const customerId = loginRes.body.data.user._id;

        const res = await request(app).get(
            `/api/restaurants/recommendations/${customerId}`
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.recommendations)).toBe(true);
        expect(res.body.data.recommendations.length).toBeGreaterThan(0);
        expect(res.body.data.recommendations[0].recommendationScore).toBeDefined();
    });
});

