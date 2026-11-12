import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import api from "../services/api";

const MyOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState("All");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const res = await api.get(
                    `/orders/history${statusFilter !== "All" ? `?status=${encodeURIComponent(statusFilter)}` : ""}`
                );
                setOrders(res.data?.data?.orders || []);
            } catch {
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [statusFilter]);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-2">
                        <Package className="w-7 h-7 text-orange-500" />
                        <span>My Orders</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track active orders in real time or view past receipts
                    </p>
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                    <option value="All">All Orders</option>
                    <option value="Order Placed">Order Placed</option>
                    <option value="Food Preparing">Food Preparing</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((n) => (
                        <div
                            key={n}
                            className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                        />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold">No orders found</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Place your first order from top restaurants near you!
                    </p>
                    <Link
                        to="/restaurants"
                        className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold"
                    >
                        Explore Restaurants
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((ord) => (
                        <div
                            key={ord._id}
                            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-400 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-sm text-orange-500">
                                        #{ord.orderNumber}
                                    </span>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ord.status === "Delivered"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : ord.status === "Cancelled"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-blue-100 text-blue-700"
                                            }`}
                                    >
                                        {ord.status}
                                    </span>
                                    {ord.fraudFlag?.isFlagged && (
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" />
                                            Risk Score: {ord.fraudFlag.riskScore}
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-bold text-lg">
                                    {ord.restaurant?.name || "ZingBite Partner Kitchen"}
                                </h3>

                                <p className="text-xs text-slate-500">
                                    {(ord.items || [])
                                        .map((i) => `${i.quantity}x ${i.name}`)
                                        .join(", ")}
                                </p>

                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(ord.createdAt).toLocaleString()}
                                    </span>
                                    <span>•</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        Total: ₹{ord.pricing?.grandTotal} ({ord.paymentStatus})
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <Link
                                    to={`/orders/${ord._id}`}
                                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                                >
                                    <span>Live Track / Details</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyOrdersPage;

