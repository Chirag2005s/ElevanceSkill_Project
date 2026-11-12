import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    ShoppingBag,
    Trash2,
    Plus,
    Minus,
    Tag,
    Zap,
    ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import {
    updateItemQuantity,
    applyCouponState,
    removeCouponState,
    clearCartState,
} from "../store/cartSlice";

const CartPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { restaurant, items, couponCode, discountAmount } = useSelector(
        (state) => state.cart
    );
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const [couponInput, setCouponInput] = useState(couponCode || "");
    const [availableCoupons, setAvailableCoupons] = useState([]);
    const [surgeBreakdown, setSurgeBreakdown] = useState(null);

    const subtotal = items.reduce(
        (sum, item) =>
            sum +
            (Number(item.food.price) +
                (item.addons || []).reduce((s, a) => s + Number(a.price || 0), 0)) *
            item.quantity,
        0
    );

    useEffect(() => {
        api.get("/users/coupons")
            .then((res) => setAvailableCoupons(res.data?.data?.coupons || []))
            .catch(() => { });
    }, []);

    // Fetch live Dynamic Surge Delivery Fee from Backend (Task 3)
    useEffect(() => {
        if (!restaurant?._id || items.length === 0) return;

        const customerCoords =
            user?.savedAddresses?.[0]?.location?.coordinates || [77.6408, 12.9784];
        api.post("/orders/calculate-delivery-fee", {
            restaurantId: restaurant._id,
            restaurantCoordinates: restaurant.location?.coordinates,
            customerCoordinates: customerCoords,
            subtotal,
        })
            .then((res) => {
                if (res.data?.data?.pricingBreakdown) {
                    setSurgeBreakdown(res.data.data.pricingBreakdown);
                }
            })
            .catch(() => { });
    }, [restaurant?._id, subtotal, items.length, user]);

    const handleApplyCoupon = async (codeToTry = couponInput) => {
        if (!isAuthenticated) {
            toast.error("Please sign in to apply promo coupons");
            navigate("/login");
            return;
        }
        if (!codeToTry.trim()) {
            toast.error("Enter a coupon code");
            return;
        }

        try {
            const res = await api.post("/users/coupons/validate", {
                code: codeToTry.trim(),
                subtotal,
            });
            if (res.data?.data) {
                dispatch(
                    applyCouponState({
                        code: res.data.data.coupon.code,
                        discountAmount: res.data.data.discountAmount,
                    })
                );
                setCouponInput(res.data.data.coupon.code);
                toast.success(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid coupon code");
        }
    };

    if (items.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-500 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-extrabold">Your Cart is Empty</h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Good food is always cooking! Go ahead and order some delicious dishes from top
                    restaurants near you.
                </p>
                <Link
                    to="/restaurants"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25"
                >
                    <span>Browse Restaurants</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    const deliveryFee = surgeBreakdown?.deliveryFee ?? 38;
    const taxAmount = Math.round(subtotal * 0.05);
    const packagingFee = 20;
    const grandTotal = Math.max(
        1,
        subtotal + taxAmount + packagingFee + deliveryFee - (discountAmount || 0)
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">Your Food Cart</h1>
                    {restaurant && (
                        <Link
                            to={`/restaurants/${restaurant._id}`}
                            className="text-sm font-bold text-orange-500 hover:underline"
                        >
                            Ordering from {restaurant.name}
                        </Link>
                    )}
                </div>

                <button
                    onClick={() => dispatch(clearCartState())}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Cart</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Cart Items & Coupons */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item) => (
                            <div
                                key={item.food._id}
                                className="p-4 sm:p-5 flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3.5">
                                    <img
                                        src={item.food.image}
                                        alt={item.food.name}
                                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                                    />
                                    <div>
                                        <h3 className="font-bold text-sm sm:text-base">
                                            {item.food.name}
                                        </h3>
                                        <span className="text-xs font-semibold text-slate-500">
                                            ₹{item.food.price} each
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs">
                                        <button
                                            onClick={() =>
                                                dispatch(
                                                    updateItemQuantity({
                                                        foodId: item.food._id,
                                                        quantity: item.quantity - 1,
                                                    })
                                                )
                                            }
                                            className="cursor-pointer"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            onClick={() =>
                                                dispatch(
                                                    updateItemQuantity({
                                                        foodId: item.food._id,
                                                        quantity: item.quantity + 1,
                                                    })
                                                )
                                            }
                                            className="cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <span className="font-extrabold text-sm w-16 text-right">
                                        ₹{item.food.price * item.quantity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Coupon Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <Tag className="w-4 h-4 text-orange-500" />
                            <span>Apply Promo Coupon</span>
                        </h3>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                placeholder="Enter coupon code (e.g. ZING50)"
                                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                            {couponCode ? (
                                <button
                                    onClick={() => {
                                        dispatch(removeCouponState());
                                        setCouponInput("");
                                        toast.success("Coupon removed");
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                                >
                                    Remove
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleApplyCoupon(couponInput)}
                                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
                                >
                                    Apply
                                </button>
                            )}
                        </div>

                        {availableCoupons.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                {availableCoupons.map((c) => (
                                    <div
                                        key={c._id}
                                        onClick={() => handleApplyCoupon(c.code)}
                                        className="p-3 rounded-xl border border-dashed border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors"
                                    >
                                        <div>
                                            <span className="font-extrabold text-xs text-orange-600 dark:text-orange-400">
                                                {c.code}
                                            </span>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                {c.title} (Min ₹{c.minOrderAmount})
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-orange-500">
                                            Apply
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Bill & Dynamic Surge Pricing Breakdown (Task 3) */}
                <div className="lg:col-span-5 space-y-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="font-extrabold text-lg">Transparent Bill Breakdown</h3>

                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Item Subtotal</span>
                                <span className="font-semibold">₹{subtotal}</span>
                            </div>

                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>
                                    Delivery Partner Fee ({surgeBreakdown?.distanceKm || 3.2} km)
                                </span>
                                <span className="font-semibold">₹{deliveryFee}</span>
                            </div>

                            {surgeBreakdown && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3.5 h-3.5 text-orange-500" />
                                            Dynamic Surge Engine (Task 3)
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
                                            {surgeBreakdown.surgeMultiplier}x (
                                            {surgeBreakdown.demandLevel})
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Base: ₹{surgeBreakdown.baseDeliveryFee} + Distance: ₹
                                        {surgeBreakdown.distanceFee} •{" "}
                                        {surgeBreakdown.peakHourApplied}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Restaurant Packaging Charges</span>
                                <span className="font-semibold">₹{packagingFee}</span>
                            </div>

                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>GST & Restaurant Taxes (5%)</span>
                                <span className="font-semibold">₹{taxAmount}</span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>Coupon Discount ({couponCode})</span>
                                    <span>-₹{discountAmount}</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-lg font-extrabold text-slate-900 dark:text-white">
                                <span>To Pay</span>
                                <span>₹{grandTotal}</span>
                            </div>
                        </div>

                        <button
                            onClick={() =>
                                isAuthenticated ? navigate("/checkout") : navigate("/login")
                            }
                            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                            <span>
                                {isAuthenticated
                                    ? "Proceed to Checkout"
                                    : "Sign In to Checkout"}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;

