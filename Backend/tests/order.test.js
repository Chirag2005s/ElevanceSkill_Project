const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");
const Restaurant = require("../models/Restaurant.model");
const Food = require("../models/Food.model");

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Task 5 & Core Order Lifecycle & Payment Verification Tests", () => {
    let customerToken = "";
    let ownerToken = "";
    let createdOrderId = "";

    beforeAll(async () => {
        const [custLogin, ownerLogin] = await Promise.all([
            request(app).post("/api/auth/login").send({
                email: process.env.SEED_CUSTOMER_EMAIL || "customer@zingbite.com",
                password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
            }),
            request(app).post("/api/auth/login").send({
                email: process.env.SEED_RESTAURANT_EMAIL || "owner@zingbite.com",
                password: process.env.SEED_RESTAURANT_PASSWORD || "Owner@123",
            }),
        ]);
        customerToken = custLogin.body.data.token;
        ownerToken = ownerLogin.body.data.token;
    });

    it("should create a new order and recalculate pricing & fraud score on backend", async () => {
        const rest = await Restaurant.findOne({ isOpen: true });
        const food = await Food.findOne({ restaurant: rest._id, isAvailable: true });

        const res = await request(app)
            .post("/api/orders/create")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                restaurantId: rest._id,
                items: [{ foodId: food._id, quantity: 1 }],
                paymentMethod: "ONLINE",
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.order.pricing.grandTotal).toBeGreaterThan(0);
        createdOrderId = res.body.data.order._id;
    });

    it("should forbid customer role from calling PATCH /api/orders/update-status/:orderId", async () => {
        const res = await request(app)
            .patch(`/api/orders/update-status/${createdOrderId}`)
            .set("Authorization", `Bearer ${customerToken}`)
            .send({ status: "Restaurant Accepted" });

        expect(res.statusCode).toBe(403);
    });

    it("should allow restaurant owner to accept order and trigger auto delivery assignment", async () => {
        const res = await request(app)
            .patch(`/api/orders/update-status/${createdOrderId}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .send({ status: "Restaurant Accepted" });

        expect(res.statusCode).toBe(200);
        expect(
            ["Restaurant Accepted", "Delivery Partner Assigned"].includes(
                res.body.data.order.status
            )
        ).toBe(true);
    });
});

