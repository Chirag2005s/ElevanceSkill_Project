const rateLimit = require("express-rate-limit");

const isTestEnv = () => process.env.NODE_ENV === "test";

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 600,
    skip: isTestEnv,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes.",
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    skip: isTestEnv,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login or registration attempts, please try again later.",
    },
});

const orderLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 30,
    skip: isTestEnv,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Order rate limit reached. Please wait a moment before placing another order.",
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    orderLimiter,
};

