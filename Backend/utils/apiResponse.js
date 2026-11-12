class ApiError extends Error {
    constructor(statusCode, message, errors = [], stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

class ApiResponse {
    constructor(statusCode, data, message = "Success", meta = null) {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.data = data;
        if (meta) {
            this.meta = meta;
        }
    }
}

const sendSuccess = (res, statusCode = 200, message = "Success", data = {}, meta = null) => {
    const payload = {
        success: true,
        message,
        data,
    };
    if (meta) {
        payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
};

const sendError = (res, statusCode = 500, message = "Internal Server Error", errors = []) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors: errors.length > 0 ? errors : undefined,
    });
};

module.exports = {
    ApiError,
    ApiResponse,
    sendSuccess,
    sendError,
};

