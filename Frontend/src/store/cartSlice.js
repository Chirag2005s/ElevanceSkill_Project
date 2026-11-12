import { createSlice } from "@reduxjs/toolkit";

const savedCart = localStorage.getItem("zingbite_cart");
const parsedCart = savedCart
    ? JSON.parse(savedCart)
    : {
        restaurant: null,
        items: [],
        couponCode: "",
        discountAmount: 0,
    };

const persistCart = (state) => {
    localStorage.setItem(
        "zingbite_cart",
        JSON.stringify({
            restaurant: state.restaurant,
            items: state.items,
            couponCode: state.couponCode,
            discountAmount: state.discountAmount,
        })
    );
};

const cartSlice = createSlice({
    name: "cart",
    initialState: parsedCart,
    reducers: {
        addToCart: (state, action) => {
            const { food, restaurant, quantity = 1, addons = [] } = action.payload;

            // If adding from a different restaurant, reset cart to the new restaurant
            if (
                state.restaurant &&
                restaurant &&
                state.restaurant._id !== restaurant._id &&
                state.items.length > 0
            ) {
                state.items = [];
                state.couponCode = "";
                state.discountAmount = 0;
            }

            if (restaurant) {
                state.restaurant = {
                    _id: restaurant._id,
                    name: restaurant.name,
                    bannerImage: restaurant.bannerImage,
                    address: restaurant.address,
                    location: restaurant.location,
                    deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
                };
            }

            const existingIndex = state.items.findIndex((i) => i.food._id === food._id);
            if (existingIndex > -1) {
                state.items[existingIndex].quantity += quantity;
            } else {
                state.items.push({
                    food: {
                        _id: food._id,
                        name: food.name,
                        price: food.discountPrice || food.price,
                        originalPrice: food.price,
                        image: food.image,
                        isVeg: food.isVeg,
                        categoryName: food.categoryName,
                    },
                    quantity,
                    addons,
                });
            }
            persistCart(state);
        },
        updateItemQuantity: (state, action) => {
            const { foodId, quantity } = action.payload;
            const idx = state.items.findIndex((i) => i.food._id === foodId);
            if (idx > -1) {
                if (quantity <= 0) {
                    state.items.splice(idx, 1);
                } else {
                    state.items[idx].quantity = quantity;
                }
            }
            if (state.items.length === 0) {
                state.restaurant = null;
                state.couponCode = "";
                state.discountAmount = 0;
            }
            persistCart(state);
        },
        removeFromCart: (state, action) => {
            state.items = state.items.filter((i) => i.food._id !== action.payload);
            if (state.items.length === 0) {
                state.restaurant = null;
                state.couponCode = "";
                state.discountAmount = 0;
            }
            persistCart(state);
        },
        applyCouponState: (state, action) => {
            state.couponCode = action.payload.code;
            state.discountAmount = action.payload.discountAmount;
            persistCart(state);
        },
        removeCouponState: (state) => {
            state.couponCode = "";
            state.discountAmount = 0;
            persistCart(state);
        },
        clearCartState: (state) => {
            state.restaurant = null;
            state.items = [];
            state.couponCode = "";
            state.discountAmount = 0;
            localStorage.removeItem("zingbite_cart");
        },
    },
});

export const {
    addToCart,
    updateItemQuantity,
    removeFromCart,
    applyCouponState,
    removeCouponState,
    clearCartState,
} = cartSlice.actions;

export default cartSlice.reducer;

