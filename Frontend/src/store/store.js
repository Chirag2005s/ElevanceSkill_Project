import { createSlice } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";

const notificationSlice = createSlice({
    name: "notifications",
    initialState: {
        items: [],
        unreadCount: 0,
    },
    reducers: {
        setNotifications: (state, action) => {
            state.items = action.payload.notifications || [];
            state.unreadCount = action.payload.unreadCount || 0;
        },
        pushNotification: (state, action) => {
            const { notification, unreadCount } = action.payload;
            if (notification) {
                state.items = [notification, ...state.items.slice(0, 39)];
            }
            state.unreadCount =
                unreadCount !== undefined ? unreadCount : state.unreadCount + 1;
        },
        markAllReadLocal: (state) => {
            state.items = state.items.map((n) => ({ ...n, isRead: true }));
            state.unreadCount = 0;
        },
    },
});

const savedTheme = localStorage.getItem("zingbite_theme") || "light";
if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
}

const themeSlice = createSlice({
    name: "theme",
    initialState: { mode: savedTheme },
    reducers: {
        toggleTheme: (state) => {
            state.mode = state.mode === "light" ? "dark" : "light";
            localStorage.setItem("zingbite_theme", state.mode);
            if (typeof document !== "undefined") {
                document.documentElement.classList.toggle("dark", state.mode === "dark");
            }
        },
    },
});

export const { setNotifications, pushNotification, markAllReadLocal } =
    notificationSlice.actions;
export const { toggleTheme } = themeSlice.actions;

import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        cart: cartReducer,
        notifications: notificationSlice.reducer,
        theme: themeSlice.reducer,
    },
});

export default store;

