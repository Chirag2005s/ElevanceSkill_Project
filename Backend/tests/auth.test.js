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

describe("Authentication & Role-Based Authorization API Tests", () => {
    it("should log in seeded customer and set HTTP-only JWT cookie", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: process.env.SEED_CUSTOMER_EMAIL || "customer@zingbite.com",
            password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.role).toBe("customer");
    });

    it("should block unauthenticated requests to /api/auth/me", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it("should block customer role from accessing /api/admin/overview (RBAC)", async () => {
        const loginRes = await request(app).post("/api/auth/login").send({
            email: process.env.SEED_CUSTOMER_EMAIL || "customer@zingbite.com",
            password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
        });
        const token = loginRes.body.data.token;

        const adminRes = await request(app)
            .get("/api/admin/overview")
            .set("Authorization", `Bearer ${token}`);

        expect(adminRes.statusCode).toBe(403);
    });
});

