import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    MapPin,
    CreditCard,
    Banknote,
    ShieldCheck,
    Zap,
    Plus,
    Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { clearCartState } from "../store/cartSlice";
import { updateUserState } from "../store/authSlice";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { restaurant, items, couponCode, discountAmount } = useSelector(
        (state) => state.cart
    );
    const { user } = useSelector((state) => state.auth);

    const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("ONLINE");
    const [specialInstructions, setSpecialInstructions] = useState("");
    const [simulatedHour, setSimulatedHour] = useState("");
    const [surgeBreakdown, setSurgeBreakdown] = useState(null);
    const [placingOrder, setPlacingOrder] = useState(false);

    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [newStreet, setNewStreet] = useState("");
    const [newLabel, setNewLabel] = useState("Home");
    const [newPincode, setNewPincode] = useState("560038");

    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.food.price) * item.quantity,
        0
    );

    const selectedAddress = user?.savedAddresses?.[selectedAddressIdx] || {
        label: "Home",
        street: "742, 100 Feet Road, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        location: { type: "Point", coordinates: [77.6408, 12.9784] },
    };

    useEffect(() => {
        if (!restaurant?._id) return;
        api.post("/orders/calculate-delivery-fee", {
            restaurantId: restaurant._id,
            restaurantCoordinates: restaurant.location?.coordinates,
            customerCoordinates: selectedAddress.location?.coordinates,
            subtotal,
            simulatedHour: simulatedHour !== "" ? Number(simulatedHour) : null,
        })
            .then((res) => {
                if (res.data?.data?.pricingBreakdown) {
                    setSurgeBreakdown(res.data.data.pricingBreakdown);
                }
            })
            .catch(() => { });
    }, [restaurant?._id, selectedAddressIdx, subtotal, simulatedHour]);

    const handleAddNewAddress = async (e) => {
        e.preventDefault();
        if (!newStreet.trim()) return;
        try {
            const res = await api.post("/users/addresses", {
                label: newLabel,
                street: newStreet,
                pincode: newPincode,
                lat: 12.9716,
                lng: 77.6197,
            });
            if (res.data?.data?.savedAddresses) {
                dispatch(updateUserState({ savedAddresses: res.data.data.savedAddresses }));
                setShowNewAddressForm(false);
                setNewStreet("");
                toast.success("Address saved");
            }
        } catch {
            toast.error("Failed to save address");
        }
    };

    const handlePlaceOrder = async () => {
        if (items.length === 0 || !restaurant) {
            toast.error("Your cart is empty");
            return;
        }

        setPlacingOrder(true);
        try {
            const payload = {
                restaurantId: restaurant._id,
                items: items.map((i) => ({
                    foodId: i.food._id,
                    quantity: i.quantity,
                    addons: i.addons || [],
                })),
                deliveryAddress: selectedAddress,
                couponCode,
                paymentMethod,
                specialInstructions,
                simulatedHour: simulatedHour !== "" ? Number(simulatedHour) : null,
            };

            const res = await api.post("/orders/create", payload);
            const createdOrder = res.data?.data?.order;
            const fraudEval = res.data?.data?.fraudEvaluation;

            dispatch(clearCartState());

            if (fraudEval?.isFlagged) {
                toast(
                    `Order #${createdOrder.orderNumber} flagged for ${fraudEval.riskLevel} Risk Review (Score: ${fraudEval.riskScore})`,
                    { icon: "🛡️", duration: 5000 }
                );
            } else {
                toast.success(`Order #${createdOrder.orderNumber} created!`);
            }

            if (paymentMethod === "ONLINE") {
                navigate(`/payment/${createdOrder._id}`);
            } else {
                navigate(`/orders/${createdOrder._id}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not place order");
        } finally {
            setPlacingOrder(false);
        }
    };

    const deliveryFee = surgeBreakdown?.deliveryFee ?? 40;
    const taxAmount = Math.round(subtotal * 0.05);
    const packagingFee = 20;
    const grandTotal = Math.max(
        1,
        subtotal + taxAmount + packagingFee + deliveryFee - (discountAmount || 0)
    );

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-extrabold mb-8">Secure Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-orange-500" />
                                <span>1. Select Delivery Address</span>
                            </h3>
                            <button
                                onClick={() => setShowNewAddressForm((p) => !p)}
                                className="text-xs font-bold text-orange-500 flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add New Address
                            </button>
                        </div>

                        {showNewAddressForm && (
                            <form
                                onSubmit={handleAddNewAddress}
                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-3"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="Home">Home</option>
                                        <option value="Work">Work</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={newPincode}
                                        onChange={(e) => setNewPincode(e.target.value)}
                                        placeholder="Pincode"
                                        className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={newStreet}
                                    onChange={(e) => setNewStreet(e.target.value)}
                                    placeholder="Flat / Building / Street / Locality"
                                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold cursor-pointer"
                                >
                                    Save Address
                                </button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(user?.savedAddresses?.length
                                ? user.savedAddresses
                                : [selectedAddress]
                            ).map((addr, idx) => (
                                <div
                                    key={addr._id || idx}
                                    onClick={() => setSelectedAddressIdx(idx)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedAddressIdx === idx
                                            ? "border-orange-500 bg-orange-50/40 dark:bg-orange-950/20"
                                            : "border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                    <span className="px-2 py-0.5 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold uppercase">
                                        {addr.label}
                                    </span>
                                    <p className="text-xs font-semibold mt-2">{addr.street}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {addr.city} - {addr.pincode}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" />
                            <span>2. Dynamic Surge Time Simulator (Task 3)</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: "Live Current Time", val: "" },
                                { label: "Simulate Lunch Peak (1:15 PM)", val: "13" },
                                { label: "Simulate Dinner Peak (8:15 PM)", val: "20" },
                                { label: "Simulate Off-Peak (4:15 PM)", val: "16" },
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => setSimulatedHour(opt.val)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${simulatedHour === opt.val
                                            ? "bg-orange-500 text-white border-orange-500"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-bold text-lg">3. Select Payment Mode</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div
                                onClick={() => setPaymentMethod("ONLINE")}
                                className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer ${paymentMethod === "ONLINE"
                                        ? "border-orange-500 bg-orange-50/40 dark:bg-orange-950/20"
                                        : "border-slate-200 dark:border-slate-800"
                                    }`}
                            >
                                <CreditCard className="w-6 h-6 text-orange-500" />
                                <div>
                                    <h4 className="font-bold text-sm">Razorpay Online (Test Mode)</h4>
                                    <p className="text-[11px] text-slate-500">
                                        UPI, Cards, Netbanking (Signature Verified)
                                    </p>
                                </div>
                            </div>

                            <div
                                onClick={() => setPaymentMethod("COD")}
                                className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer ${paymentMethod === "COD"
                                        ? "border-orange-500 bg-orange-50/40 dark:bg-orange-950/20"
                                        : "border-slate-200 dark:border-slate-800"
                                    }`}
                            >
                                <Banknote className="w-6 h-6 text-emerald-500" />
                                <div>
                                    <h4 className="font-bold text-sm">Cash on Delivery (COD)</h4>
                                    <p className="text-[11px] text-slate-500">
                                        Pay cash or UPI at your doorstep
                                    </p>
                                </div>
                            </div>
                        </div>

                        <textarea
                            rows={2}
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="Cooking or delivery instructions..."
                            className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 sticky top-24">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-lg">Order Summary</h3>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Fraud-Checked
                            </span>
                        </div>

                        {surgeBreakdown && (
                            <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-800/50 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-orange-700 dark:text-orange-300">
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5" />
                                        {surgeBreakdown.peakHourApplied}
                                    </span>
                                    <span>
                                        {surgeBreakdown.surgeMultiplier}x (
                                        {surgeBreakdown.demandLevel})
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    Distance: {surgeBreakdown.distanceKm} km • Base ₹
                                    {surgeBreakdown.baseDeliveryFee} + Distance ₹
                                    {surgeBreakdown.distanceFee}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Dynamic Delivery Fee</span>
                                <span>₹{deliveryFee}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Packaging + GST (5%)</span>
                                <span>₹{packagingFee + taxAmount}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>Discount ({couponCode})</span>
                                    <span>-₹{discountAmount}</span>
                                </div>
                            )}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-lg font-extrabold">
                                <span>Total Payable</span>
                                <span>₹{grandTotal}</span>
                            </div>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={placingOrder}
                            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50"
                        >
                            {placingOrder
                                ? "Validating & Creating Order..."
                                : paymentMethod === "ONLINE"
                                    ? `Proceed to Pay ₹${grandTotal}`
                                    : `Place COD Order (₹${grandTotal})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

