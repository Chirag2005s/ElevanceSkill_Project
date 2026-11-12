const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { ApiError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const extractToken = (req) => {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    return null;
};

/**
 * Mandatory Authentication Middleware
 * Verifies JWT from HTTP-only cookie or Authorization Bearer header,
 * attaches user document, and enforces account restriction policies.
 */
const protect = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        throw new ApiError(401, "Authentication required. Please log in to access this resource.");
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "swiggy_prod_jwt_secret_key_2026_enterprise_edition"
    );

    const user = await User.findById(decoded.id);
    if (!user) {
        throw new ApiError(401, "User associated with this token no longer exists.");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Your account has been deactivated. Please contact support.");
    }

    // Auto-expire temporary restrictions if restrictedUntil has passed
    if (user.isRestricted && user.restrictedUntil && new Date() > new Date(user.restrictedUntil)) {
        user.isRestricted = false;
        user.restrictionReason = "";
        user.restrictedUntil = null;
        await user.save();
    }

    req.user = user;
    next();
});

/**
 * Optional Authentication Middleware (used for personalized search & recommendations)
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "swiggy_prod_jwt_secret_key_2026_enterprise_edition"
        );
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
            req.user = user;
        }
    } catch {
        // Ignore invalid token for public endpoints
    }
    next();
});

/**
 * Blocks restricted users from placing orders or requesting refunds
 */
const ensureNotRestricted = (req, res, next) => {
    if (req.user && req.user.isRestricted) {
        const reason = req.user.restrictionReason || "Suspicious account activity detected";
        return next(
            new ApiError(
                403,
                `Your account is temporarily restricted from placing orders (${reason}). Please contact support.`
            )
        );
    }
    next();
};

module.exports = {
    protect,
    optionalAuth,
    ensureNotRestricted,
    extractToken,
};

