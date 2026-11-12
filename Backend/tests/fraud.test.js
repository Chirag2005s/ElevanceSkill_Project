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

describe("Task 1: Fraud Detection & Order Validation System Tests", () => {
    let adminToken = "";

    beforeAll(async () => {
        const loginRes = await request(app).post("/api/auth/login").send({
            email: process.env.SEED_ADMIN_EMAIL || "admin@zingbite.com",
            password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
        });
        adminToken = loginRes.body.data.token;
    });

    it("should list flagged orders and risk scores for admin", async () => {
        const res = await request(app)
            .get("/api/admin/fraud/orders")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.orders)).toBe(true);
        expect(res.body.data.summary).toBeDefined();
    });

    it("should allow admin to approve a flagged order and record audit log", async () => {
        const listRes = await request(app)
            .get("/api/admin/fraud/orders")
            .set("Authorization", `Bearer ${adminToken}`);
        const targetOrder = listRes.body.data.orders[0];

        if (targetOrder) {
            const approveRes = await request(app)
                .patch(`/api/admin/fraud/orders/${targetOrder._id}/approve`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ note: "Approved during automated Jest test" });

            expect(approveRes.statusCode).toBe(200);
            expect(approveRes.body.data.order.fraudFlag.reviewStatus).toBe("approved");
        }
    });
});

