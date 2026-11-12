import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
    CheckCircle2,
    MapPin,
    Phone,
    ShieldAlert,
    Truck,
    Store,
    XCircle,
    RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { getSocket, connectSocket } from "../services/socket";

const LIFECYCLE_STEPS = [
    "Order Placed",
    "Restaurant Accepted",
    "Food Preparing",
    "Ready for Pickup",
    "Delivery Partner Assigned",
    "Picked Up",
    "Out for Delivery",
    "Delivered",
];

const OrderTrackingPage = () => {
    const { orderId } = useParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refundReason, setRefundReason] = useState("");
    const [showRefundModal, setShowRefundModal] = useState(false);

    const fetchOrderDetails = async () => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            if (res.data?.data) {
                setOrder(res.data.data.order);
            }
        } catch {
            toast.error("Could not load order tracking details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetails();

        const socket = getSocket() || connectSocket();
        socket.emit("order:join", orderId);

        const handleStatusUpdate = (payload) => {
            if (payload.orderId === orderId) {
                toast.success(`Live Update: Order is now '${payload.status}'!`);
                fetchOrderDetails();
            }
        };

        socket.on("order:status_updated", handleStatusUpdate);
        return () => {
            socket.emit("order:leave", orderId);
            socket.off("order:status_updated", handleStatusUpdate);
        };
    }, [orderId]);

    const handleCancelOrder = async () => {
        try {
            const res = await api.post(`/orders/cancel/${orderId}`, {
                reason: "Customer cancelled from tracking page",
            });
            setOrder(res.data?.data?.order);
            toast.success("Order cancelled");
        } catch (err) {
            toast.error(err.response?.data?.message || "Cannot cancel order at this stage");
        }
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        if (!refundReason.trim()) {
            toast.error("Please enter a reason for the refund");
            return;
        }
        try {
            const res = await api.post(`/orders/${orderId}/refund`, {
                reason: refundReason.trim(),
            });
            setOrder(res.data?.data?.order);
            setShowRefundModal(false);
            toast.success("Refund request submitted!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not submit refund request");
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold">Order Not Found</h2>
                <Link to="/my-orders" className="text-orange-500 font-bold text-sm mt-3 block">
                    View My Orders
                </Link>
            </div>
        );
    }

    const currentStepIdx = LIFECYCLE_STEPS.indexOf(order.status);
    const isTerminalBad = [
        "Cancelled",
        "Restaurant Rejected",
        "Refund Initiated",
        "Refund Completed",
    ].includes(order.status);
    const canCancel = ["Order Placed", "Restaurant Accepted"].includes(order.status);
    const mapProgress =
        currentStepIdx < 0 ? 0 : Math.min(100, Math.round(((currentStepIdx + 1) / 8) * 100));

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-extrabold">
                            Order #{order.orderNumber}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Socket.IO Live Connected
                        </span>
                        {order.fraudFlag?.isFlagged && (
                            <span className="px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                {order.fraudFlag.riskLevel} Fraud Risk (Score:{" "}
                                {order.fraudFlag.riskScore})
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold">{order.status}</h1>
                    <p className="text-xs text-slate-300">
                        From <strong className="text-white">{order.restaurant?.name}</strong> to{" "}
                        <strong className="text-white">{order.deliveryAddress?.street}</strong>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canCancel && (
                        <button
                            onClick={handleCancelOrder}
                            className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-400/40 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <XCircle className="w-4 h-4" />
                            <span>Cancel Order</span>
                        </button>
                    )}

                    {["Delivered", "Cancelled", "Restaurant Rejected"].includes(order.status) && (
                        <button
                            onClick={() => setShowRefundModal(true)}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Request Refund</span>
                        </button>
                    )}
                </div>
            </div>

            {!isTerminalBad && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-6">
                        Live 8-Stage Order Lifecycle (Task 5)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {LIFECYCLE_STEPS.map((step, index) => {
                            const completed = index <= currentStepIdx;
                            const isCurrent = index === currentStepIdx;
                            return (
                                <div
                                    key={step}
                                    className={`p-3 rounded-2xl border text-center transition-all ${isCurrent
                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 shadow-md"
                                            : completed
                                                ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                                                : "border-slate-200 dark:border-slate-800 opacity-50"
                                        }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-extrabold mb-2 ${completed
                                                ? "bg-emerald-500 text-white"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                            }`}
                                    >
                                        {completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <span className="text-[11px] font-bold block leading-tight">
                                        {step}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                                    2dsphere Geospatial Tracking
                                </span>
                                <h3 className="text-lg font-extrabold">Live Route Telemetry</h3>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10">
                                Distance: {order.pricing?.distanceKm || 3.5} km
                            </span>
                        </div>

                        <div className="relative py-8 px-4">
                            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all duration-700"
                                    style={{ width: `${mapProgress}%` }}
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="font-bold block">
                                            {order.restaurant?.name}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-right">
                                    <div>
                                        <span className="font-bold block">Customer Dropoff</span>
                                        <span className="text-[10px] text-slate-400">
                                            {order.deliveryAddress?.street}
                                        </span>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {order.deliveryPartner && (
                            <div className="mt-4 p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-orange-300">
                                            Assigned Delivery Partner (Task 4)
                                        </span>
                                        <h4 className="font-extrabold text-sm">
                                            {order.deliveryPartner.user?.name || "ZingBite Partner"}
                                        </h4>
                                        <p className="text-xs text-slate-300">
                                            {order.deliveryPartner.vehicleType} •{" "}
                                            {order.deliveryPartner.vehicleNumber}
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={`tel:${order.deliveryPartner.user?.phone || "9740055667"}`}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Phone className="w-3.5 h-3.5" /> Call Rider
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-extrabold text-lg">Order Items & Pricing</h3>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(order.items || []).map((item, idx) => (
                                <div
                                    key={idx}
                                    className="py-2.5 flex items-center justify-between text-sm"
                                >
                                    <span>
                                        <strong>{item.quantity}x</strong> {item.name}
                                    </span>
                                    <span className="font-bold">₹{item.itemTotal}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex justify-between">
                                <span>Item Subtotal</span>
                                <span>₹{order.pricing?.subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>
                                    Delivery Fee ({order.pricing?.surgeMultiplier}x{" "}
                                    {order.pricing?.demandLevel})
                                </span>
                                <span>₹{order.pricing?.deliveryFee}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                                <span>Grand Total ({order.paymentMethod})</span>
                                <span>₹{order.pricing?.grandTotal}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showRefundModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <form
                        onSubmit={handleRequestRefund}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                        <h3 className="text-lg font-extrabold">Request Order Refund</h3>
                        <textarea
                            rows={3}
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="Describe the issue..."
                            className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowRefundModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white cursor-pointer"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default OrderTrackingPage;

