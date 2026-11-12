const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const registerOrderSocketHandlers = require("./order.socket");

let ioInstance = null;

const parseCookieToken = (cookieHeader = "") => {
    const cookies = cookieHeader.split(";").reduce((acc, item) => {
        const [k, v] = item.trim().split("=");
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
    }, {});
    return cookies.token || null;
};

const initSocketServer = (httpServer) => {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: [
                process.env.CLIENT_URL || "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5173",
            ],
            credentials: true,
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        },
    });

    // Socket Authentication Middleware
    ioInstance.use((socket, next) => {
        try {
            const authToken =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
                parseCookieToken(socket.handshake.headers?.cookie);

            if (authToken) {
                const decoded = jwt.verify(
                    authToken,
                    process.env.JWT_SECRET || "swiggy_prod_jwt_secret_key_2026_enterprise_edition"
                );
                socket.user = decoded;
            }
            next();
        } catch {
            // Allow connection so public clients can upgrade later via 'auth:identify'
            next();
        }
    });

    ioInstance.on("connection", (socket) => {
        if (socket.user?.id) {
            socket.join(`user:${socket.user.id}`);
            if (socket.user.role) {
                socket.join(`role:${socket.user.role}`);
            }
        }

        socket.on("auth:identify", (payload) => {
            if (payload?.userId) {
                socket.join(`user:${payload.userId}`);
            }
            if (payload?.role) {
                socket.join(`role:${payload.role}`);
            }
            if (payload?.restaurantId) {
                socket.join(`restaurant:${payload.restaurantId}`);
            }
            if (payload?.deliveryPartnerId) {
                socket.join(`delivery:${payload.deliveryPartnerId}`);
            }
        });

        registerOrderSocketHandlers(ioInstance, socket);
    });

    return ioInstance;
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, data) => {
    if (ioInstance && userId) {
        ioInstance.to(`user:${userId.toString()}`).emit(event, data);
    }
};

const emitToOrderRoom = (orderId, event, data) => {
    if (ioInstance && orderId) {
        ioInstance.to(`order:${orderId.toString()}`).emit(event, data);
    }
};

const emitToRestaurant = (restaurantId, event, data) => {
    if (ioInstance && restaurantId) {
        ioInstance.to(`restaurant:${restaurantId.toString()}`).emit(event, data);
    }
};

const emitToDeliveryPartner = (partnerId, event, data) => {
    if (ioInstance && partnerId) {
        ioInstance.to(`delivery:${partnerId.toString()}`).emit(event, data);
    }
};

const emitToAdmins = (event, data) => {
    if (ioInstance) {
        ioInstance.to("role:admin").emit(event, data);
    }
};

module.exports = {
    initSocketServer,
    getIO,
    emitToUser,
    emitToOrderRoom,
    emitToRestaurant,
    emitToDeliveryPartner,
    emitToAdmins,
};

