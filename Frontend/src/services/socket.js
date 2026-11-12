import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

let socket = null;

export const connectSocket = (user = null, roleContext = {}) => {
    const token = localStorage.getItem("zingbite_token");

    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            auth: { token },
            transports: ["websocket", "polling"],
        });
    }

    if (user?._id) {
        socket.emit("auth:identify", {
            userId: user._id,
            role: user.role,
            restaurantId: roleContext.restaurant?._id,
            deliveryPartnerId: roleContext.deliveryPartner?._id,
        });
    }

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

