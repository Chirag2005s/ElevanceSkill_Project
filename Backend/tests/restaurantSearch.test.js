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

describe("Task 2: Advanced Restaurant Search & Filtering Engine Tests", () => {
    it("should filter restaurants by cuisine, rating, and maxDeliveryTime", async () => {
        const res = await request(app).get(
            "/api/restaurants/search?cuisine=Biryani&rating=4&maxDeliveryTime=35"
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.restaurants)).toBe(true);
        expect(res.body.data.restaurants.length).toBeGreaterThan(0);
    });

    it("should handle spelling mistakes using Fuse.js fuzzy search ('birynai' -> Biryani)", async () => {
        const res = await request(app).get("/api/restaurants/search?q=birynai");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.restaurants.length).toBeGreaterThan(0);
    });

    it("should filter vegetarian restaurants and support price range filtering", async () => {
        const res = await request(app).get(
            "/api/restaurants/search?vegetarian=true&minPrice=100&maxPrice=600&sortBy=rating"
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.data.restaurants.length).toBeGreaterThan(0);
    });
});

