const connectDB = require("../config/db");

/**
 * Preserved wrapper around config/db.js for backward compatibility
 * with any existing imports of ./DB/connect.js
 */
const Connection = async () => {
    return connectDB();
};

module.exports = Connection;
