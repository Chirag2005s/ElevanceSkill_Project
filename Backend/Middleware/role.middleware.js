const { ApiError } = require("../utils/apiResponse");

/**
 * Role-Based Access Control (RBAC) Middleware
 * Usage: authorizeRoles("admin", "restaurant")
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Authentication required."));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new ApiError(
                    403,
                    `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
                )
            );
        }

        next();
    };
};

module.exports = {
    authorizeRoles,
};

