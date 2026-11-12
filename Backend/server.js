const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const app = require("./app");
const Connection = require("./DB/connect");
const { initSocketServer } = require("./sockets/socket");

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.IO Real-Time Server (Task 5)
initSocketServer(server);

const startServer = async () => {
    try {
        await Connection();
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { app, server };
