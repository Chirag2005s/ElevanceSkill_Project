const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    const mongoUri =
        process.env.MONGODB_URI ||
        "mongodb+srv://elevanceskill664_db_user:elevance2027@elevanceskillcompany.42xyjtw.mongodb.net/SwiggyDataBase";

    try {
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
        isConnected = true;
        if (process.env.NODE_ENV !== "test") {
            console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
        }
        return conn;
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        if (process.env.NODE_ENV === "production") {
            process.exit(1);
        }
        throw err;
    }
};

module.exports = connectDB;

