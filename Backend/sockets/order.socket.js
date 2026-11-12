/**
 * Order & Delivery Live Tracking Socket Event Handlers (Task 5)
 */
const registerOrderSocketHandlers = (io, socket) => {
    // Customer / Restaurant / Delivery Partner joins a specific order tracking room
    socket.on("order:join", (orderId) => {
        if (orderId) {
            socket.join(`order:${orderId}`);
        }
    });

    socket.on("order:leave", (orderId) => {
        if (orderId) {
            socket.leave(`order:${orderId}`);
        }
    });

    // Restaurant owner joins their restaurant live order stream
    socket.on("restaurant:join", (restaurantId) => {
        if (restaurantId) {
            socket.join(`restaurant:${restaurantId}`);
        }
    });

    // Delivery partner joins their assignment stream & broadcasts live GPS coordinates
    socket.on("delivery:join", (partnerId) => {
        if (partnerId) {
            socket.join(`delivery:${partnerId}`);
        }
    });

    socket.on("delivery:location_update", (payload) => {
        const { orderId, partnerId, coordinates, heading } = payload || {};
        if (orderId && Array.isArray(coordinates) && coordinates.length === 2) {
            io.to(`order:${orderId}`).emit("order:driver_location", {
                orderId,
                partnerId,
                coordinates,
                heading: heading || 0,
                updatedAt: new Date().toISOString(),
            });
        }
    });
};

module.exports = registerOrderSocketHandlers;

