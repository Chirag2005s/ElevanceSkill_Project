const { validationResult } = require("express-validator");
const { ApiError } = require("../utils/apiResponse");

/**
 * Recursively strips MongoDB operator keys ($gt, $ne, $where, etc.) and trims basic XSS script tags
 * Compatible with Express 5 where req.query is a getter.
 */
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    for (const key of Object.keys(obj)) {
        if (key.startsWith("$") || key.includes(".")) {
            delete obj[key];
            continue;
        }
        const value = obj[key];
        if (typeof value === "string") {
            obj[key] = value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .trim();
        } else if (typeof value === "object" && value !== null) {
            sanitizeObject(value);
        }
    }
    return obj;
};

const sanitizeInputs = (req, res, next) => {
    if (req.body && typeof req.body === "object") {
        sanitizeObject(req.body);
    }
    if (req.params && typeof req.params === "object") {
        sanitizeObject(req.params);
    }
    next();
};

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map((err) => `${err.path}: ${err.msg}`);
        return next(new ApiError(400, extractedErrors[0], extractedErrors));
    }
    next();
};

module.exports = {
    sanitizeInputs,
    validateRequest,
};

