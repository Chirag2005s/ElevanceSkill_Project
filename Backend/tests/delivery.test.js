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

describe("Task 4: Smart Delivery Partner Assignment System Tests", () => {
    let riderToken = "";
    let adminToken = "";

    beforeAll(async () => {
        const [riderLogin, adminLogin] = await Promise.all([
            request(app).post("/api/auth/login").send({
                email: process.env.SEED_DELIVERY_EMAIL || "rider@zingbite.com",
                password: process.env.SEED_DELIVERY_PASSWORD || "Rider@123",
            }),
            request(app).post("/api/auth/login").send({
                email: process.env.SEED_ADMIN_EMAIL || "admin@zingbite.com",
                password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
            }),
        ]);
        riderToken = riderLogin.body.data.token;
        adminToken = adminLogin.body.data.token;
    });

    it("should update delivery partner availability and 2dsphere coordinates", async () => {
        const res = await request(app)
            .post("/api/delivery/set-status")
            .set("Authorization", `Bearer ${riderToken}`)
            .send({
                isOnline: true,
                isAvailable: true,
                lat: 12.9716,
                lng: 77.6197,
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.partner.isOnline).toBe(true);
    });

    it("should find available nearby delivery partners using 2dsphere geospatial query", async () => {
        const res = await request(app)
            .get("/api/delivery/available?lat=12.9716&lng=77.6197")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data.nearbyEligiblePartners)).toBe(true);
    });
});

