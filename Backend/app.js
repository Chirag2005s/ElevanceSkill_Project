const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { sanitizeInputs } = require("./middleware/validation.middleware");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");
const { upload, uploadImageBuffer } = require("./config/cloudinary");
const { protect } = require("./middleware/auth.middleware");
const asyncHandler = require("./utils/asyncHandler");
const { sendSuccess } = require("./utils/apiResponse");

// Route Imports
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const restaurantRoutes = require("./routes/restaurant.routes");
const foodRoutes = require("./routes/food.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const deliveryRoutes = require("./routes/delivery.routes");
const adminRoutes = require("./routes/admin.routes");
const fraudRoutes = require("./routes/fraud.routes");
const surgeRoutes = require("./routes/surge.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();

// Security Headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// CORS Configuration
app.use(
    cors({
        origin: [
            process.env.CLIENT_URL || "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
);

// Body & Cookie Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request Logging in Dev Mode
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// Input Sanitization & Global Rate Limiter
app.use(sanitizeInputs);
app.use("/api", apiLimiter);

// Health Check Endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        platform: "ZingBite Enterprise Food Delivery API",
        message: `Server is running on port ${process.env.PORT || 4000}`,
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        uptime: process.uptime(),
    });
});

// Image Upload Endpoint (Multer + Cloudinary)
app.post(
    "/api/upload",
    protect,
    upload.single("image"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }
        const imageUrl = await uploadImageBuffer(req.file.buffer, req.file.mimetype);
        return sendSuccess(res, 200, "Image uploaded successfully", { imageUrl });
    })
);

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/surge", surgeRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

