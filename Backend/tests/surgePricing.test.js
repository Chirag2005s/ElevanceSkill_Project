const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");
const Restaurant = require("../models/Restaurant.model");

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Task 3: Dynamic Surge Pricing Engine Tests", () => {
    it("should calculate delivery fee dynamically with peak hour simulation", async () => {
        const rest = await Restaurant.findOne();
        const res = await request(app)
            .post("/api/orders/calculate-delivery-fee")
            .send({
                restaurantId: rest?._id,
                customerCoordinates: [77.6408, 12.9784],
                subtotal: 450,
                simulatedHour: 13, // 1 PM Lunch Peak
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        const breakdown = res.body.data.pricingBreakdown;
        expect(breakdown.deliveryFee).toBeGreaterThan(0);
        expect(breakdown.surgeMultiplier).toBeGreaterThanOrEqual(1.2);
        expect(breakdown.isPeakHour).toBe(true);
    });

    it("should allow admin to fetch and update surge pricing settings", async () => {
        const adminLogin = await request(app).post("/api/auth/login").send({
            email: process.env.SEED_ADMIN_EMAIL || "admin@zingbite.com",
            password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
        });
        const adminToken = adminLogin.body.data.token;

        const getRes = await request(app)
            .get("/api/admin/surge-settings")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data.settings.baseDeliveryFee).toBeDefined();
    });
});

