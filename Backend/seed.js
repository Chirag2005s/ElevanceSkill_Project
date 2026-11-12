const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User.model");
const Restaurant = require("./models/Restaurant.model");
const Category = require("./models/Category.model");
const Food = require("./models/Food.model");
const Coupon = require("./models/Coupon.model");
const DeliveryPartner = require("./models/DeliveryPartner.model");
const DeliveryAssignment = require("./models/DeliveryAssignment.model");
const Order = require("./models/Order.model");
const Payment = require("./models/Payment.model");
const Review = require("./models/Review.model");
const SurgePricing = require("./models/SurgePricing.model");
const UserPreference = require("./models/UserPreference.model");
const FraudActivity = require("./models/FraudActivity.model");
const FraudRecord = require("./models/FraudRecord.model");
const Refund = require("./models/Refund.model");
const Notification = require("./models/Notification.model");
const AdminAuditLog = require("./models/AdminAuditLog.model");

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Connected to MongoDB. Clearing existing seed collections...");

        await Promise.all([
            User.deleteMany({}),
            Restaurant.deleteMany({}),
            Category.deleteMany({}),
            Food.deleteMany({}),
            Coupon.deleteMany({}),
            DeliveryPartner.deleteMany({}),
            DeliveryAssignment.deleteMany({}),
            Order.deleteMany({}),
            Payment.deleteMany({}),
            Review.deleteMany({}),
            SurgePricing.deleteMany({}),
            UserPreference.deleteMany({}),
            FraudActivity.deleteMany({}),
            FraudRecord.deleteMany({}),
            Refund.deleteMany({}),
            Notification.deleteMany({}),
            AdminAuditLog.deleteMany({}),
        ]);

        // 1. Create Demo Users using Environment Variables (Section 13)
        const adminUser = await User.create({
            name: "Vikram Aditya (Platform Admin)",
            email: process.env.SEED_ADMIN_EMAIL || "admin@zingbite.com",
            password: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
            phone: "9880011223",
            role: "admin",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
            savedAddresses: [
                {
                    label: "Work",
                    street: "UB City Tower, Vittal Mallya Road",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560001",
                    location: { type: "Point", coordinates: [77.5963, 12.9719] },
                    isDefault: true,
                },
            ],
        });

        const customerUser = await User.create({
            name: "Aarav Sharma",
            email: process.env.SEED_CUSTOMER_EMAIL || "customer@zingbite.com",
            password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
            phone: "9845098450",
            role: "customer",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
            savedAddresses: [
                {
                    label: "Home",
                    street: "742, 100 Feet Road, Indiranagar",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560038",
                    landmark: "Near Metro Station",
                    location: { type: "Point", coordinates: [77.6408, 12.9784] },
                    isDefault: true,
                },
                {
                    label: "Work",
                    street: "Embassy GolfLinks, Domlur",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560071",
                    landmark: "Block B",
                    location: { type: "Point", coordinates: [77.6432, 12.9517] },
                    isDefault: false,
                },
            ],
        });

        const highRiskCustomer = await User.create({
            name: "Rohan Verma (Flagged Account)",
            email: "rohan.flagged@zingbite.com",
            password: process.env.SEED_CUSTOMER_PASSWORD || "Customer@123",
            phone: "9900112233",
            role: "customer",
            riskScore: 85,
            riskLevel: "High",
            failedTransactionCount: 4,
            savedAddresses: [
                {
                    label: "Home",
                    street: "4th Block, Koramangala",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560034",
                    location: { type: "Point", coordinates: [77.6245, 12.9352] },
                    isDefault: true,
                },
            ],
        });

        const restaurantOwnerUser = await User.create({
            name: "Chef Rajeshwari Nair",
            email: process.env.SEED_RESTAURANT_EMAIL || "owner@zingbite.com",
            password: process.env.SEED_RESTAURANT_PASSWORD || "Owner@123",
            phone: "9845112233",
            role: "restaurant",
            avatar: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80",
        });

        const deliveryPartnerUser1 = await User.create({
            name: "Kiran Kumar (Senior Rider)",
            email: process.env.SEED_DELIVERY_EMAIL || "rider@zingbite.com",
            password: process.env.SEED_DELIVERY_PASSWORD || "Rider@123",
            phone: "9740055667",
            role: "delivery",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        });

        const deliveryPartnerUser2 = await User.create({
            name: "Deepak Gowda",
            email: "deepak.rider@zingbite.com",
            password: process.env.SEED_DELIVERY_PASSWORD || "Rider@123",
            phone: "9740088990",
            role: "delivery",
        });

        const deliveryPartnerUser3 = await User.create({
            name: "Mohammed Irfan",
            email: "irfan.rider@zingbite.com",
            password: process.env.SEED_DELIVERY_PASSWORD || "Rider@123",
            phone: "9740033445",
            role: "delivery",
        });

        // 2. Create Delivery Partners with 2dsphere Coordinates
        const partner1 = await DeliveryPartner.create({
            user: deliveryPartnerUser1._id,
            vehicleType: "Electric Scooter",
            vehicleNumber: "KA-01-ZB-1001",
            licenseNumber: "KA0120260011223",
            zone: "Indiranagar / Koramangala",
            currentLocation: { type: "Point", coordinates: [77.6385, 12.9721] },
            isOnline: true,
            isAvailable: true,
            activityStatus: "Idle",
            totalDeliveriesCompleted: 142,
            rating: 4.9,
            earnings: { today: 480, thisWeek: 3450, total: 48200, pendingPayout: 1250 },
        });

        const partner2 = await DeliveryPartner.create({
            user: deliveryPartnerUser2._id,
            vehicleType: "Bike",
            vehicleNumber: "KA-03-ZB-4455",
            licenseNumber: "KA0320260099887",
            zone: "MG Road / Central",
            currentLocation: { type: "Point", coordinates: [77.6112, 12.9735] },
            isOnline: true,
            isAvailable: true,
            activityStatus: "Idle",
            totalDeliveriesCompleted: 89,
            rating: 4.7,
            earnings: { today: 320, thisWeek: 2180, total: 29400, pendingPayout: 680 },
        });

        await DeliveryPartner.create({
            user: deliveryPartnerUser3._id,
            vehicleType: "Scooter",
            vehicleNumber: "KA-05-ZB-8821",
            licenseNumber: "KA0520260077661",
            zone: "HSR / South Bengaluru",
            currentLocation: { type: "Point", coordinates: [77.6387, 12.9121] },
            isOnline: false,
            isAvailable: false,
            activityStatus: "Offline",
            totalDeliveriesCompleted: 64,
            rating: 4.6,
            earnings: { today: 0, thisWeek: 1850, total: 19200, pendingPayout: 400 },
        });

        // 3. Create 8 Realistic Restaurants
        const restaurantsData = [
            {
                owner: restaurantOwnerUser._id,
                name: "Meghana Royal Biryani House",
                description:
                    "Legendary Andhra-style dum biryanis, spicy starters, and rich North Indian curries crafted with authentic hand-ground spices.",
                cuisines: ["Biryani", "North Indian", "Andhra", "Mughlai"],
                bannerImage:
                    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "52, 1st Cross, Koramangala 5th Block",
                    area: "Koramangala",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560095",
                },
                location: { type: "Point", coordinates: [77.6245, 12.9352] },
                phone: "9845112233",
                email: "owner@zingbite.com",
                rating: 4.7,
                totalRatings: 1840,
                priceRange: "$$",
                avgPriceForTwo: 500,
                deliveryTimeMinutes: 25,
                isVegOnly: false,
                hasVegOptions: true,
                isOpen: true,
                isFeatured: true,
                popularityScore: 96,
                totalOrdersCompleted: 420,
                searchImpressions: 640,
                recommendationImpressions: 380,
                offerText: "FLAT ₹120 OFF above ₹399",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Vidyarthi Heritage Tiffins",
                description:
                    "Crispy golden butter masala dosas, fluffy idlis, filter kaapi, and traditional South Indian breakfast platters since 1943.",
                cuisines: ["South Indian", "Healthy Food", "Beverages"],
                bannerImage:
                    "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "Gandhi Bazaar Main Road, Basavanagudi",
                    area: "Basavanagudi",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560004",
                },
                location: { type: "Point", coordinates: [77.5713, 12.9448] },
                phone: "9845223344",
                rating: 4.8,
                totalRatings: 2310,
                priceRange: "$",
                avgPriceForTwo: 220,
                deliveryTimeMinutes: 20,
                isVegOnly: true,
                hasVegOptions: true,
                isOpen: true,
                isFeatured: true,
                popularityScore: 94,
                totalOrdersCompleted: 510,
                searchImpressions: 590,
                recommendationImpressions: 410,
                offerText: "20% OFF up to ₹60",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Truffles Gourmet Burgers & Bistro",
                description:
                    "Bengaluru's favorite craft burger joint serving smashed burgers, peri-peri fries, creamy pastas, and thick Belgian shakes.",
                cuisines: ["Burgers", "American", "Continental", "Beverages"],
                bannerImage:
                    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "100 Feet Road, Indiranagar",
                    area: "Indiranagar",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560038",
                },
                location: { type: "Point", coordinates: [77.6408, 12.9784] },
                phone: "9845334455",
                rating: 4.6,
                totalRatings: 1620,
                priceRange: "$$",
                avgPriceForTwo: 450,
                deliveryTimeMinutes: 28,
                isVegOnly: false,
                hasVegOptions: true,
                isOpen: true,
                isFeatured: true,
                popularityScore: 91,
                totalOrdersCompleted: 365,
                searchImpressions: 520,
                recommendationImpressions: 340,
                offerText: "50% OFF up to ₹100",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Napoli Wood-Fired Pizzeria",
                description:
                    "Artisanal sourdough Neapolitan pizzas baked in an oak-fired brick oven with San Marzano tomatoes and fresh burrata.",
                cuisines: ["Italian", "Pizza", "Pasta", "Desserts"],
                bannerImage:
                    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "12th Main, HAL 2nd Stage, Indiranagar",
                    area: "Indiranagar",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560008",
                },
                location: { type: "Point", coordinates: [77.6352, 12.9711] },
                phone: "9845445566",
                rating: 4.5,
                totalRatings: 940,
                priceRange: "$$$",
                avgPriceForTwo: 650,
                deliveryTimeMinutes: 32,
                isVegOnly: true,
                hasVegOptions: true,
                isOpen: true,
                isFeatured: false,
                popularityScore: 86,
                totalOrdersCompleted: 230,
                searchImpressions: 410,
                recommendationImpressions: 290,
                offerText: "FREE Garlic Bread above ₹499",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Mainland Wok & Dimsum Studio",
                description:
                    "Hand-folded crystal dimsums, fiery Schezwan hakka noodles, kung pao bowls, and pan-Asian wok specialties.",
                cuisines: ["Chinese", "Asian", "Thai"],
                bannerImage:
                    "https://images.unsplash.com/photo-1552611052-33e04de081de?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "Church Street, MG Road",
                    area: "MG Road",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560001",
                },
                location: { type: "Point", coordinates: [77.6069, 12.9746] },
                phone: "9845556677",
                rating: 4.4,
                totalRatings: 780,
                priceRange: "$$$",
                avgPriceForTwo: 550,
                deliveryTimeMinutes: 35,
                isVegOnly: false,
                hasVegOptions: true,
                isOpen: true,
                popularityScore: 82,
                totalOrdersCompleted: 195,
                searchImpressions: 350,
                recommendationImpressions: 210,
                offerText: "30% OFF up to ₹90",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Punjab Grill & Tandoor Dhaba",
                description:
                    "Slow-simmered Dal Makhani, smoky Tandoori Butter Chicken, Amritsari Kulchas, and rich Punjabi lassi.",
                cuisines: ["North Indian", "Punjabi", "Mughlai", "Biryani"],
                bannerImage:
                    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "27th Main Road, HSR Layout Sector 1",
                    area: "HSR Layout",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560102",
                },
                location: { type: "Point", coordinates: [77.6481, 12.9166] },
                phone: "9845667788",
                rating: 4.5,
                totalRatings: 1120,
                priceRange: "$$",
                avgPriceForTwo: 400,
                deliveryTimeMinutes: 27,
                isVegOnly: false,
                hasVegOptions: true,
                isOpen: true,
                popularityScore: 88,
                totalOrdersCompleted: 290,
                searchImpressions: 430,
                recommendationImpressions: 275,
                offerText: "40% OFF up to ₹100",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "Belgian Waffle & Gelato Factory",
                description:
                    "Freshly baked crispy Belgian waffles, triple-chocolate brownies, artisan Italian gelato, and tiramisu jars.",
                cuisines: ["Desserts", "Bakery", "Beverages"],
                bannerImage:
                    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "Lavelle Road, Central Bengaluru",
                    area: "MG Road",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560001",
                },
                location: { type: "Point", coordinates: [77.5991, 12.9702] },
                phone: "9845778899",
                rating: 4.6,
                totalRatings: 890,
                priceRange: "$",
                avgPriceForTwo: 280,
                deliveryTimeMinutes: 22,
                isVegOnly: true,
                hasVegOptions: true,
                isOpen: true,
                popularityScore: 84,
                totalOrdersCompleted: 215,
                searchImpressions: 310,
                recommendationImpressions: 240,
                offerText: "Buy 1 Get 1 Free on Waffles",
            },
            {
                owner: restaurantOwnerUser._id,
                name: "GreenCraft Poke & Protein Bowls",
                description:
                    "Macro-balanced Mediterranean quinoa bowls, avocado sourdough toasts, cold-pressed juices, and keto salads.",
                cuisines: ["Healthy Food", "Salads", "Continental"],
                bannerImage:
                    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&auto=format&fit=crop&q=80",
                logoImage:
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
                address: {
                    street: "ITPL Main Road, Whitefield",
                    area: "Whitefield",
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: "560066",
                },
                location: { type: "Point", coordinates: [77.7499, 12.9698] },
                phone: "9845889900",
                rating: 4.4,
                totalRatings: 540,
                priceRange: "$$",
                avgPriceForTwo: 380,
                deliveryTimeMinutes: 24,
                isVegOnly: true,
                hasVegOptions: true,
                isOpen: true,
                popularityScore: 79,
                totalOrdersCompleted: 145,
                searchImpressions: 270,
                recommendationImpressions: 190,
                offerText: "FLAT ₹75 OFF on Protein Bowls",
            },
        ];

        const restaurants = await Restaurant.insertMany(restaurantsData);
        const [meghana, vidyarthi, truffles, napoli, mainland, punjab, waffle, greencraft] =
            restaurants;

        // 4. Create Menu Categories & Food Items
        const foodsToCreate = [
            // Meghana Royal Biryani House
            {
                restaurant: meghana._id,
                categoryName: "Royal Dum Biryanis",
                name: "Meghana Special Boneless Chicken Biryani",
                description:
                    "Signature long-grain basmati rice layered with spice-marinated boneless chicken chunks, saffron, and caramelized onions. Served with raita and mirchi ka salan.",
                price: 349,
                discountPrice: 319,
                isVeg: false,
                spiceLevel: "Spicy",
                preparationTimeMinutes: 18,
                calories: 640,
                serves: "Serves 1-2",
                isBestseller: true,
                rating: 4.8,
                totalRatings: 920,
                orderCount: 410,
                image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
                tags: ["Biryani", "Bestseller", "Andhra"],
                addons: [
                    { name: "Extra Masala Boiled Egg", price: 30, isVeg: false },
                    { name: "Extra Raita Cup", price: 25, isVeg: true },
                ],
            },
            {
                restaurant: meghana._id,
                categoryName: "Royal Dum Biryanis",
                name: "Shahi Paneer Tikka Dum Biryani",
                description:
                    "Char-grilled malai paneer cubes layered with aromatic saffron basmati rice, mint, and roasted cashews.",
                price: 299,
                discountPrice: 269,
                isVeg: true,
                spiceLevel: "Medium",
                preparationTimeMinutes: 15,
                calories: 560,
                serves: "Serves 1-2",
                isBestseller: true,
                rating: 4.7,
                totalRatings: 540,
                orderCount: 280,
                image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
                tags: ["Paneer", "Veg Biryani", "Bestseller"],
            },
            {
                restaurant: meghana._id,
                categoryName: "Andhra Starters",
                name: "Guntur Chilli Chicken 65",
                description:
                    "Crispy wok-tossed chicken tempered with curry leaves, crushed garlic, and fiery Guntur red chillies.",
                price: 279,
                isVeg: false,
                spiceLevel: "Extra Spicy",
                preparationTimeMinutes: 14,
                calories: 420,
                isBestseller: true,
                rating: 4.6,
                orderCount: 195,
                image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80",
                tags: ["Starter", "Chicken"],
            },
            {
                restaurant: meghana._id,
                categoryName: "North Indian Curries",
                name: "Paneer Butter Masala with 2 Butter Naans",
                description:
                    "Cottage cheese cubes simmered in velvety makhani tomato-cashew gravy served with two tandoori butter naans.",
                price: 289,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 16,
                calories: 590,
                rating: 4.5,
                orderCount: 150,
                image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
                tags: ["Paneer", "Combo"],
            },

            // Vidyarthi Heritage Tiffins
            {
                restaurant: vidyarthi._id,
                categoryName: "Signature Dosas",
                name: "Benne Masala Dosa",
                description:
                    "Thick, golden-crisp fermented rice crepe roasted with farm-fresh white butter, red garlic chutney, and spiced potato palya.",
                price: 129,
                isVeg: true,
                spiceLevel: "Medium",
                preparationTimeMinutes: 10,
                calories: 380,
                isBestseller: true,
                rating: 4.9,
                totalRatings: 1120,
                orderCount: 520,
                image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80",
                tags: ["Dosa", "South Indian", "Pure Veg"],
            },
            {
                restaurant: vidyarthi._id,
                categoryName: "South Indian Tiffins",
                name: "Thatte Idli & Crispy Vada Dip Platter",
                description:
                    "Two pillow-soft steamed rice idlis and one crispy medu vada served with hot sambar and fresh coconut chutney.",
                price: 99,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 8,
                calories: 290,
                isBestseller: true,
                rating: 4.8,
                orderCount: 340,
                image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80",
                tags: ["Idli", "Breakfast"],
            },
            {
                restaurant: vidyarthi._id,
                categoryName: "Beverages",
                name: "Chikmagalur Brass Filter Kaapi",
                description:
                    "Frothy, aromatic South Indian filter coffee brewed with freshly roasted Chikmagalur Arabica beans.",
                price: 65,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 5,
                calories: 110,
                rating: 4.8,
                orderCount: 410,
                image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
                tags: ["Coffee", "Beverage"],
            },

            // Truffles Gourmet Burgers & Bistro
            {
                restaurant: truffles._id,
                categoryName: "Craft Burgers",
                name: "All-American Double Cheese Smash Burger",
                description:
                    "Double grilled patty, aged melted cheddar, caramelized onions, house pickles, and smoky truffle aioli in a toasted brioche bun.",
                price: 259,
                discountPrice: 229,
                isVeg: false,
                spiceLevel: "Medium",
                preparationTimeMinutes: 15,
                calories: 620,
                isBestseller: true,
                rating: 4.7,
                orderCount: 390,
                image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
                tags: ["Burger", "Bestseller"],
            },
            {
                restaurant: truffles._id,
                categoryName: "Craft Burgers",
                name: "Crispy Peri-Peri Paneer Crunch Burger",
                description:
                    "Panko-crusted spiced cottage cheese steak with jalapenos, iceberg lettuce, and chipotle mayo.",
                price: 229,
                isVeg: true,
                spiceLevel: "Spicy",
                preparationTimeMinutes: 14,
                calories: 540,
                isBestseller: true,
                rating: 4.6,
                orderCount: 270,
                image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80",
                tags: ["Veg Burger", "Paneer"],
            },
            {
                restaurant: truffles._id,
                categoryName: "Pastas & Sides",
                name: "Baked Mac & Three-Cheese Truffle Pasta",
                description:
                    "Creamy macaroni baked with cheddar, mozzarella, parmesan, and herb garlic breadsticks.",
                price: 279,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 16,
                calories: 580,
                rating: 4.6,
                orderCount: 190,
                image: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&auto=format&fit=crop&q=80",
                tags: ["Pasta", "Cheese"],
            },

            // Napoli Wood-Fired Pizzeria
            {
                restaurant: napoli._id,
                categoryName: "Wood-Fired Pizzas",
                name: "Margherita Con Burrata (12 Inch)",
                description:
                    "24-hour fermented sourdough crust topped with San Marzano tomato sauce, fresh basil, extra virgin olive oil, and creamy burrata.",
                price: 399,
                discountPrice: 359,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 20,
                calories: 710,
                isBestseller: true,
                rating: 4.7,
                orderCount: 245,
                image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80",
                tags: ["Pizza", "Italian", "Pure Veg"],
            },
            {
                restaurant: napoli._id,
                categoryName: "Wood-Fired Pizzas",
                name: "Quattro Formaggi & Jalapeno Pizza",
                description:
                    "Four-cheese blend of mozzarella, gorgonzola, scamorza, and parmigiano with pickled jalapenos.",
                price: 429,
                isVeg: true,
                spiceLevel: "Medium",
                preparationTimeMinutes: 20,
                calories: 760,
                rating: 4.5,
                orderCount: 165,
                image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80",
                tags: ["Pizza", "Cheese"],
            },

            // Mainland Wok & Dimsum Studio
            {
                restaurant: mainland._id,
                categoryName: "Wok Noodles & Bowls",
                name: "Fiery Schezwan Chilli Garlic Hakka Noodles",
                description:
                    "Wok-tossed noodles with julienned bell peppers, spring onions, shiitake mushrooms, and house Schezwan pepper oil.",
                price: 249,
                isVeg: true,
                spiceLevel: "Spicy",
                preparationTimeMinutes: 14,
                calories: 460,
                isBestseller: true,
                rating: 4.5,
                orderCount: 210,
                image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&auto=format&fit=crop&q=80",
                tags: ["Noodles", "Chinese"],
            },
            {
                restaurant: mainland._id,
                categoryName: "Dimsums",
                name: "Steamed Crystal Veg & Water Chestnut Dimsums (6 Pcs)",
                description:
                    "Translucent steamed dumplings filled with crunchy water chestnuts, bok choy, and roasted sesame oil.",
                price: 269,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 15,
                calories: 310,
                rating: 4.6,
                orderCount: 175,
                image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80",
                tags: ["Dimsum", "Asian"],
            },

            // Punjab Grill & Tandoor Dhaba
            {
                restaurant: punjab._id,
                categoryName: "Tandoor & Curries",
                name: "Old Delhi Smoked Butter Chicken",
                description:
                    "Charcoal-roasted tandoori chicken tikka simmered in rich tomato, fenugreek, and white butter gravy.",
                price: 339,
                discountPrice: 299,
                isVeg: false,
                spiceLevel: "Medium",
                preparationTimeMinutes: 18,
                calories: 610,
                isBestseller: true,
                rating: 4.7,
                orderCount: 310,
                image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80",
                tags: ["Butter Chicken", "North Indian"],
            },
            {
                restaurant: punjab._id,
                categoryName: "Tandoor & Curries",
                name: "24-Hour Dal Makhani & Amritsari Stuffed Kulcha",
                description:
                    "Black lentils slow-cooked overnight on charcoal embers with cream, served with crispy potato-stuffed kulcha.",
                price: 259,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 15,
                calories: 540,
                isBestseller: true,
                rating: 4.6,
                orderCount: 260,
                image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80",
                tags: ["Dal Makhani", "Punjabi"],
            },

            // Belgian Waffle & Gelato Factory
            {
                restaurant: waffle._id,
                categoryName: "Belgian Waffles",
                name: "Triple Chocolate Overload Belgian Waffle",
                description:
                    "Warm crispy chocolate waffle loaded with Belgian dark, milk, and white melted chocolate fudge.",
                price: 189,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 10,
                calories: 480,
                isBestseller: true,
                rating: 4.8,
                orderCount: 330,
                image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&auto=format&fit=crop&q=80",
                tags: ["Waffle", "Dessert"],
            },

            // GreenCraft Poke & Protein Bowls
            {
                restaurant: greencraft._id,
                categoryName: "Superfood Bowls",
                name: "Mediterranean Falafel & Quinoa Power Bowl",
                description:
                    "Tri-color quinoa, baked herb falafel, roasted chickpeas, Kalamata olives, feta, avocado, and tahini lemon dressing.",
                price: 289,
                isVeg: true,
                spiceLevel: "Mild",
                preparationTimeMinutes: 12,
                calories: 390,
                isBestseller: true,
                rating: 4.6,
                orderCount: 180,
                image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
                tags: ["Healthy", "Salad", "Protein"],
            },
        ];

        const foods = await Food.insertMany(foodsToCreate);

        // Create Category documents for each unique restaurant + categoryName
        const categoryPairs = new Set();
        for (const f of foods) {
            categoryPairs.add(`${f.restaurant.toString()}|${f.categoryName}`);
        }
        for (const pair of categoryPairs) {
            const [restId, catName] = pair.split("|");
            await Category.create({
                restaurant: restId,
                name: catName,
                displayOrder: 1,
            });
        }

        // 5. Create Active Coupons
        const validNextMonth = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
        await Coupon.insertMany([
            {
                code: "ZING50",
                title: "50% OFF on First Order",
                description: "Get 50% instant discount up to ₹120 on orders above ₹199",
                discountType: "percentage",
                discountValue: 50,
                minOrderAmount: 199,
                maxDiscountAmount: 120,
                validUntil: validNextMonth,
                isActive: true,
            },
            {
                code: "WELCOME100",
                title: "Flat ₹100 OFF",
                description: "Flat ₹100 OFF on orders above ₹349 across all restaurants",
                discountType: "flat",
                discountValue: 100,
                minOrderAmount: 349,
                maxDiscountAmount: 100,
                validUntil: validNextMonth,
                isActive: true,
            },
            {
                code: "BIRYANI30",
                title: "30% OFF Royal Biryani Feast",
                description: "Save 30% up to ₹150 on your favorite biryani orders",
                discountType: "percentage",
                discountValue: 30,
                minOrderAmount: 250,
                maxDiscountAmount: 150,
                validUntil: validNextMonth,
                isActive: true,
            },
            {
                code: "WEEKEND75",
                title: "Flat ₹75 Weekend Treat",
                description: "Instant ₹75 OFF on orders above ₹249",
                discountType: "flat",
                discountValue: 75,
                minOrderAmount: 249,
                maxDiscountAmount: 75,
                validUntil: validNextMonth,
                isActive: true,
            },
        ]);

        // 6. Create Surge Pricing Configuration (Task 3)
        await SurgePricing.create({
            configName: "Global Dynamic Surge Engine",
            isEnabled: true,
            baseDeliveryFee: 30,
            perKmRate: 8,
            freeDeliveryThreshold: 999,
            peakHours: {
                lunch: { enabled: true, startHour: 12, endHour: 15, multiplier: 1.2 },
                dinner: { enabled: true, startHour: 19, endHour: 22, multiplier: 1.3 },
            },
            demandMultipliers: {
                normal: 1.0,
                medium: 1.2,
                high: 1.5,
                extreme: 2.0,
            },
            demandThresholds: {
                mediumActiveOrders: 4,
                highActiveOrders: 10,
                extremeActiveOrders: 18,
            },
        });

        // 7. Create Sample Orders (Delivered, Active Live Order, and Flagged High-Risk Order)
        const deliveredOrder = await Order.create({
            orderNumber: "ZB-884120-101",
            user: customerUser._id,
            restaurant: meghana._id,
            deliveryPartner: partner1._id,
            items: [
                {
                    food: foods[0]._id,
                    name: foods[0].name,
                    image: foods[0].image,
                    price: 319,
                    quantity: 2,
                    isVeg: false,
                    itemTotal: 638,
                },
            ],
            pricing: {
                subtotal: 638,
                taxAmount: 32,
                packagingFee: 20,
                baseDeliveryFee: 30,
                distanceFee: 16,
                distanceKm: 4.0,
                surgeMultiplier: 1.0,
                demandLevel: "Normal",
                deliveryFee: 46,
                discountAmount: 100,
                couponCode: "WELCOME100",
                grandTotal: 636,
            },
            deliveryAddress: customerUser.savedAddresses[0],
            status: "Delivered",
            statusHistory: [
                { status: "Order Placed", updatedByRole: "customer", note: "Order placed" },
                { status: "Restaurant Accepted", updatedByRole: "restaurant", note: "Accepted" },
                { status: "Food Preparing", updatedByRole: "restaurant", note: "Chef cooking" },
                { status: "Ready for Pickup", updatedByRole: "restaurant", note: "Packed" },
                { status: "Delivery Partner Assigned", updatedByRole: "system", note: "Kiran assigned" },
                { status: "Picked Up", updatedByRole: "delivery", note: "Picked up" },
                { status: "Out for Delivery", updatedByRole: "delivery", note: "On the way" },
                { status: "Delivered", updatedByRole: "delivery", note: "Delivered on time" },
            ],
            paymentMethod: "ONLINE",
            paymentStatus: "Paid",
            deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        });

        const liveActiveOrder = await Order.create({
            orderNumber: "ZB-901455-202",
            user: customerUser._id,
            restaurant: meghana._id,
            deliveryPartner: partner1._id,
            items: [
                {
                    food: foods[1]._id,
                    name: foods[1].name,
                    image: foods[1].image,
                    price: 269,
                    quantity: 1,
                    isVeg: true,
                    itemTotal: 269,
                },
                {
                    food: foods[2]._id,
                    name: foods[2].name,
                    image: foods[2].image,
                    price: 279,
                    quantity: 1,
                    isVeg: false,
                    itemTotal: 279,
                },
            ],
            pricing: {
                subtotal: 548,
                taxAmount: 27,
                packagingFee: 20,
                baseDeliveryFee: 30,
                distanceFee: 12,
                distanceKm: 3.5,
                surgeMultiplier: 1.2,
                demandLevel: "Medium",
                peakHourApplied: "Lunch Peak (12:00 - 15:00)",
                deliveryFee: 50,
                discountAmount: 0,
                grandTotal: 645,
            },
            deliveryAddress: customerUser.savedAddresses[0],
            status: "Food Preparing",
            statusHistory: [
                { status: "Order Placed", updatedByRole: "customer", note: "Order placed" },
                { status: "Restaurant Accepted", updatedByRole: "restaurant", note: "Accepted by Meghana" },
                { status: "Delivery Partner Assigned", updatedByRole: "system", note: "Kiran Kumar assigned" },
                { status: "Food Preparing", updatedByRole: "restaurant", note: "Freshly preparing your biryani" },
            ],
            paymentMethod: "ONLINE",
            paymentStatus: "Paid",
        });

        await DeliveryAssignment.create({
            order: liveActiveOrder._id,
            restaurant: meghana._id,
            deliveryPartner: partner1._id,
            status: "accepted",
            pickupLocation: {
                address: "Meghana Royal Biryani House, Koramangala",
                coordinates: [77.6245, 12.9352],
            },
            dropLocation: {
                address: "742, 100 Feet Road, Indiranagar",
                coordinates: [77.6408, 12.9784],
            },
            distanceToRestaurantKm: 1.4,
            deliveryDistanceKm: 3.5,
            estimatedDurationMinutes: 22,
            partnerEarning: 52,
        });

        // Flagged High-Risk Order for Task 1 Admin Dashboard Demonstration
        const suspiciousOrder = await Order.create({
            orderNumber: "ZB-998001-999",
            user: highRiskCustomer._id,
            restaurant: truffles._id,
            items: [
                {
                    food: foods[7]._id,
                    name: foods[7].name,
                    image: foods[7].image,
                    price: 229,
                    quantity: 12,
                    isVeg: false,
                    itemTotal: 2748,
                },
            ],
            pricing: {
                subtotal: 2748,
                taxAmount: 137,
                packagingFee: 20,
                baseDeliveryFee: 30,
                distanceFee: 16,
                distanceKm: 4.0,
                surgeMultiplier: 1.2,
                demandLevel: "Medium",
                deliveryFee: 55,
                discountAmount: 120,
                couponCode: "ZING50",
                grandTotal: 2840,
            },
            deliveryAddress: highRiskCustomer.savedAddresses[0],
            status: "Order Placed",
            paymentMethod: "COD",
            paymentStatus: "Pending",
            fraudFlag: {
                isFlagged: true,
                riskScore: 85,
                riskLevel: "High",
                reasons: [
                    "Excessive orders in a short time (4 orders within 15 minutes)",
                    "Abnormal coupon usage (6 coupon uses within 24 hours)",
                    "Suspicious high-value Cash-on-Delivery order (₹2840)",
                ],
                reviewStatus: "pending_review",
            },
        });

        await FraudRecord.create({
            order: suspiciousOrder._id,
            user: highRiskCustomer._id,
            riskScore: 85,
            riskLevel: "High",
            reasons: suspiciousOrder.fraudFlag.reasons,
            triggeredRules: [
                {
                    ruleCode: "EXCESSIVE_ORDERS_SHORT_TIME",
                    description: "Excessive orders in a short time (4 orders within 15 minutes)",
                    scoreAdded: 40,
                },
                {
                    ruleCode: "ABNORMAL_COUPON_USAGE",
                    description: "Abnormal coupon usage (6 coupon uses within 24 hours)",
                    scoreAdded: 30,
                },
                {
                    ruleCode: "SUSPICIOUS_ORDER_PATTERN",
                    description: "Suspicious high-value Cash-on-Delivery order (₹2840)",
                    scoreAdded: 15,
                },
            ],
            status: "pending_review",
        });

        await FraudActivity.insertMany([
            {
                user: highRiskCustomer._id,
                order: suspiciousOrder._id,
                activityType: "EXCESSIVE_ORDERS_SHORT_TIME",
                pointsAdded: 40,
                reason: "Excessive orders in a short time (4 orders within 15 minutes)",
            },
            {
                user: highRiskCustomer._id,
                order: suspiciousOrder._id,
                activityType: "ABNORMAL_COUPON_USAGE",
                pointsAdded: 30,
                reason: "Abnormal coupon usage (6 coupon uses within 24 hours)",
            },
        ]);

        // Sample Reviews
        await Review.insertMany([
            {
                user: customerUser._id,
                restaurant: meghana._id,
                order: deliveredOrder._id,
                restaurantRating: 5,
                foodRating: 5,
                deliveryRating: 5,
                comment:
                    "Best boneless chicken biryani in Bengaluru! Arrived piping hot in 23 minutes.",
                tags: ["Authentic Spice", "Generous Portion", "Fast Delivery"],
            },
            {
                user: customerUser._id,
                restaurant: vidyarthi._id,
                restaurantRating: 5,
                foodRating: 5,
                deliveryRating: 5,
                comment: "Crispy Benne Masala Dosa and filter coffee felt just like dining at Gandhi Bazaar!",
                tags: ["Crispy Dosa", "Fresh Chutney"],
            },
        ]);

        // Sample UserPreference for Customer
        await UserPreference.create({
            user: customerUser._id,
            cuisineScores: {
                Biryani: 5,
                "North Indian": 4,
                "South Indian": 3,
                Burgers: 2,
            },
            favoriteRestaurants: [
                { restaurant: meghana._id, orderCount: 3, lastOrderedAt: new Date() },
                { restaurant: vidyarthi._id, orderCount: 2, lastOrderedAt: new Date() },
            ],
            vegOrderCount: 2,
            nonVegOrderCount: 3,
            prefersVeg: false,
            averageOrderSpend: 580,
            totalOrdersAnalyzed: 2,
        });

        // Sample Refund Request
        await Refund.create({
            order: deliveredOrder._id,
            user: customerUser._id,
            amount: 120,
            reason: "One extra raita addon was missing from the package",
            status: "Pending",
        });

        // Sample Notifications
        await Notification.insertMany([
            {
                recipient: customerUser._id,
                recipientRole: "customer",
                title: "Order Food Preparing",
                message: `Chef is now preparing your delicious meal for order #${liveActiveOrder.orderNumber}.`,
                type: "ORDER_STATUS",
                order: liveActiveOrder._id,
            },
            {
                recipient: restaurantOwnerUser._id,
                recipientRole: "restaurant",
                title: `New Order #${liveActiveOrder.orderNumber}`,
                message: `New order worth ₹645 received from Aarav Sharma.`,
                type: "NEW_ORDER",
                order: liveActiveOrder._id,
            },
            {
                recipient: deliveryPartnerUser1._id,
                recipientRole: "delivery",
                title: `New Delivery Assignment #${liveActiveOrder.orderNumber}`,
                message: `Pickup from Meghana Royal Biryani House (1.4 km away). Est. Earning: ₹52.`,
                type: "DELIVERY_ASSIGNMENT",
                order: liveActiveOrder._id,
            },
            {
                recipient: adminUser._id,
                recipientRole: "admin",
                title: "High Risk Fraud Alert (#ZB-998001-999)",
                message: "Order #ZB-998001-999 triggered a High Risk score of 85. Immediate review required.",
                type: "FRAUD_ALERT",
                order: suspiciousOrder._id,
            },
        ]);

        console.log("Database seeded successfully with all roles, 8 restaurants, 18 dishes, coupons, and fraud/surge records!");
        if (require.main === module) {
            await mongoose.connection.close();
            process.exit(0);
        }
    } catch (error) {
        console.error("Error seeding database:", error);
        if (require.main === module) {
            process.exit(1);
        }
        throw error;
    }
};

if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;

