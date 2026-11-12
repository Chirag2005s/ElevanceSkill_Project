import { createSlice } from "@reduxjs/toolkit";

const savedUser = localStorage.getItem("zingbite_user");
const savedToken = localStorage.getItem("zingbite_token");

const initialState = {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    restaurant: null,
    deliveryPartner: null,
    isAuthenticated: Boolean(savedUser && savedToken),
    loading: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, token, restaurant, deliveryPartner } = action.payload;
            state.user = user;
            if (token) {
                state.token = token;
                localStorage.setItem("zingbite_token", token);
            }
            if (restaurant !== undefined) state.restaurant = restaurant;
            if (deliveryPartner !== undefined) state.deliveryPartner = deliveryPartner;
            state.isAuthenticated = true;
            localStorage.setItem("zingbite_user", JSON.stringify(user));
        },
        updateUserState: (state, action) => {
            state.user = { ...state.user, ...action.payload };
            localStorage.setItem("zingbite_user", JSON.stringify(state.user));
        },
        clearCredentials: (state) => {
            state.user = null;
            state.token = null;
            state.restaurant = null;
            state.deliveryPartner = null;
            state.isAuthenticated = false;
            localStorage.removeItem("zingbite_user");
            localStorage.removeItem("zingbite_token");
        },
    },
});

export const { setCredentials, updateUserState, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

