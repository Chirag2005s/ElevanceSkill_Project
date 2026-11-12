const express = require("express");
const router = express.Router();
const {
    updateProfile,
    addAddress,
    deleteAddress,
    toggleWishlist,
    getWishlist,
    getCart,
    updateCart,
    clearCart,
    getAvailableCoupons,
    validateCoupon,
} = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

router.put("/profile", protect, updateProfile);
router.post("/addresses", protect, addAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:restaurantId", protect, toggleWishlist);

router.get("/cart", protect, getCart);
router.post("/cart", protect, updateCart);
router.delete("/cart", protect, clearCart);

router.get("/coupons", getAvailableCoupons);
router.post("/coupons/validate", protect, validateCoupon);

module.exports = router;

