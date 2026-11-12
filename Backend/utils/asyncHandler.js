/**
 * Wraps async Express route handlers and forwards any rejected promises
 * to the centralized error handling middleware.
 */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

module.exports = asyncHandler;

