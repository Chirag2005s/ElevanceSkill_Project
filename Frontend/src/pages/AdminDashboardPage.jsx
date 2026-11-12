import React, { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    Store,
    Search,
    ShoppingBag,
    ShieldAlert,
    Zap,
    Truck,
    RotateCcw,
    Sparkles,
    BarChart3,
    Settings,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const ADMIN_MODULES = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "fraud", label: "Task 1: Fraud Detection", icon: ShieldAlert },
    { id: "search-analytics", label: "Task 2: Search Analytics", icon: Search },
    { id: "surge", label: "Task 3: Surge Pricing", icon: Zap },
    { id: "delivery-assignments", label: "Task 4: Delivery & Reassign", icon: Truck },
    { id: "recommendations", label: "Task 6: Reco Analytics", icon: Sparkles },
    { id: "restaurants", label: "Restaurants", icon: Store },
    { id: "users", label: "Users & RBAC", icon: Users },
    { id: "orders", label: "All Orders", icon: ShoppingBag },
    { id: "refunds", label: "Refunds", icon: RotateCcw },
    { id: "reports", label: "Coupons & Reports", icon: BarChart3 },
    { id: "settings", label: "Audit Logs", icon: Settings },
];

const AdminDashboardPage = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [overview, setOverview] = useState(null);
    const [fraudData, setFraudData] = useState(null);
    const [surgeData, setSurgeData] = useState(null);
    const [deliveryData, setDeliveryData] = useState(null);
    const [users, setUsers] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [orders, setOrders] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Forms
    const [newRestaurant, setNewRestaurant] = useState({
        name: "",
        description: "",
        cuisines: "North Indian, Biryani",
        area: "Indiranagar",
        avgPriceForTwo: 400,
        deliveryTimeMinutes: 25,
    });
    const [newCoupon, setNewCoupon] = useState({
        code: "",
        title: "",
        discountType: "percentage",
        discountValue: 30,
        minOrderAmount: 199,
        maxDiscountAmount: 120,
    });

    const loadAllAdminData = async () => {
        try {
            const [
                ovRes,
                fraudRes,
                surgeRes,
                delivRes,
                usersRes,
                restRes,
                ordRes,
                refRes,
                coupRes,
                auditRes,
            ] = await Promise.all([
                api.get("/admin/overview"),
                api.get("/admin/fraud/orders"),
                api.get("/admin/surge-settings"),
                api.get("/admin/delivery-monitoring"),
                api.get("/admin/users"),
                api.get("/admin/restaurants"),
                api.get("/admin/orders"),
                api.get("/admin/refunds"),
                api.get("/admin/coupons"),
                api.get("/admin/audit-logs"),
            ]);

            setOverview(ovRes.data?.data);
            setFraudData(fraudRes.data?.data);
            setSurgeData(surgeRes.data?.data);
            setDeliveryData(delivRes.data?.data);
            setUsers(usersRes.data?.data?.users || []);
            setRestaurants(restRes.data?.data?.restaurants || []);
            setOrders(ordRes.data?.data?.orders || []);
            setRefunds(refRes.data?.data?.refunds || []);
            setCoupons(coupRes.data?.data?.coupons || []);
            setAuditLogs(auditRes.data?.data?.logs || []);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load admin console");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllAdminData();
    }, []);

    // Task 1 Handlers: Fraud Approve, Reject, User Restrict
    const handleFraudOrderAction = async (orderId, action) => {
        try {
            await api.patch(`/admin/fraud/orders/${orderId}/${action}`, {
                note: `Admin ${action}d order from Fraud Control Center`,
            });
            toast.success(`Suspicious order ${action}d!`);
            loadAllAdminData();
        } catch {
            toast.error("Failed to process fraud order action");
        }
    };

    const handleRestrictUser = async (userId, isRestricted) => {
        try {
            await api.patch(`/admin/fraud/users/${userId}/restrict`, {
                isRestricted,
                reason: isRestricted
                    ? "Multiple fraud risk rules triggered"
                    : "Cleared by Admin",
                durationHours: 48,
            });
            toast.success(isRestricted ? "User account restricted" : "User restriction lifted");
            loadAllAdminData();
        } catch {
            toast.error("Could not update user restriction");
        }
    };

    // Task 2 Handlers: Create / Delete Restaurant
    const handleCreateRestaurant = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/restaurants/create", newRestaurant);
            toast.success("Restaurant created!");
            setNewRestaurant({
                name: "",
                description: "",
                cuisines: "North Indian, Biryani",
                area: "Indiranagar",
                avgPriceForTwo: 400,
                deliveryTimeMinutes: 25,
            });
            loadAllAdminData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not create restaurant");
        }
    };

    const handleDeleteRestaurant = async (restId) => {
        try {
            await api.delete(`/admin/restaurants/delete/${restId}`);
            toast.success("Restaurant deleted");
            loadAllAdminData();
        } catch {
            toast.error("Could not delete restaurant");
        }
    };

    // Task 3 Handler: Save Surge Settings
    const handleUpdateSurge = async (updatedFields) => {
        try {
            const currentSettings = surgeData?.settings || {};
            const res = await api.put("/admin/surge-settings", {
                ...currentSettings,
                ...updatedFields,
            });
            setSurgeData(res.data?.data);
            toast.success("Dynamic Surge Pricing configuration updated!");
        } catch {
            toast.error("Failed to update surge settings");
        }
    };

    // Task 4 Handler: Reassign Order Delivery Partner
    const handleReassignDelivery = async (orderId, targetPartnerId = null) => {
        try {
            await api.post(`/admin/delivery/reassign/${orderId}`, {
                targetPartnerId,
                reason: "Admin manual dispatch reassignment",
            });
            toast.success("Delivery partner reassigned!");
            loadAllAdminData();
        } catch {
            toast.error("Reassignment failed");
        }
    };

    // Refund Handler
    const handleProcessRefund = async (refundId, status) => {
        try {
            await api.patch(`/admin/refunds/${refundId}`, {
                status,
                adminNote: `Admin marked refund as ${status}`,
            });
            toast.success(`Refund ${status}`);
            loadAllAdminData();
        } catch {
            toast.error("Failed to process refund");
        }
    };

    // Coupon Handler
    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            await api.post("/admin/coupons", newCoupon);
            toast.success("Coupon created!");
            setNewCoupon({
                code: "",
                title: "",
                discountType: "percentage",
                discountValue: 30,
                minOrderAmount: 199,
                maxDiscountAmount: 120,
            });
            loadAllAdminData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create coupon");
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    const metrics = overview?.metrics || {};

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Top Enterprise Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                        ZingBite Enterprise Control Center
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                        Platform Administration & Intelligence Hub
                    </h1>
                    <p className="text-xs text-slate-300 mt-1">
                        Real-time monitoring of Fraud Detection, Search Caching, Dynamic Surge
                        Pricing, Geospatial Dispatch & Recommendations
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs">
                        <span className="text-slate-300 block">Live Surge Status</span>
                        <span className="font-extrabold text-orange-400">
                            {overview?.liveSurgeStatus?.demandLevel || "Normal"} (
                            {overview?.liveSurgeStatus?.surgeMultiplier || 1}x)
                        </span>
                    </div>
                </div>
            </div>

            {/* Module Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {ADMIN_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    return (
                        <button
                            key={mod.id}
                            onClick={() => setActiveTab(mod.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === mod.id
                                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{mod.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* MODULE 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: "Total Revenue", val: `₹${metrics.totalRevenue || 0}`, color: "text-emerald-600" },
                            { label: "Avg Order Value", val: `₹${metrics.averageOrderValue || 0}`, color: "text-blue-600" },
                            { label: "Total Orders", val: metrics.totalOrders || 0, color: "text-orange-500" },
                            { label: "Completed / Cancelled", val: `${metrics.completedOrders || 0} / ${metrics.cancelledOrders || 0}`, color: "text-slate-800 dark:text-white" },
                            { label: "Total Customers", val: metrics.totalCustomers || 0, color: "text-slate-800 dark:text-white" },
                            { label: "Total Restaurants", val: metrics.totalRestaurants || 0, color: "text-slate-800 dark:text-white" },
                            { label: "Delivery Partners", val: metrics.totalDeliveryPartners || 0, color: "text-slate-800 dark:text-white" },
                            { label: "Flagged Fraud Orders", val: metrics.flaggedOrdersCount || 0, color: "text-red-500" },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                            >
                                <span className="text-[11px] font-bold uppercase text-slate-400">
                                    {stat.label}
                                </span>
                                <p className={`text-2xl font-extrabold mt-1 ${stat.color}`}>
                                    {stat.val}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                            <h3 className="font-extrabold text-base mb-4">
                                Top Revenue Generating Restaurants
                            </h3>
                            <div className="space-y-3">
                                {(overview?.topRevenueRestaurants || []).map((r) => (
                                    <div
                                        key={r.name}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-bold"
                                    >
                                        <span>{r.name}</span>
                                        <span className="text-emerald-600">₹{r.revenue}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                            <h3 className="font-extrabold text-base mb-4">
                                Recent Admin Security Audit Trail
                            </h3>
                            <div className="space-y-2.5 max-h-64 overflow-y-auto">
                                {(overview?.recentAuditLogs || []).map((log) => (
                                    <div
                                        key={log._id}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex justify-between"
                                    >
                                        <div>
                                            <span className="font-bold text-orange-500">
                                                {log.action}
                                            </span>
                                            <p className="text-slate-500">{log.summary}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODULE 2: TASK 1 - FRAUD DETECTION & ORDER VALIDATION */}
            {activeTab === "fraud" && (
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-extrabold flex items-center gap-2">
                                    <ShieldAlert className="w-6 h-6 text-red-500" />
                                    <span>Task 1: Suspicious Orders & Risk Scoring Queue</span>
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Risk Classification: 0–49 Low | 50–70 Medium | &gt;70 High Risk
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {(fraudData?.orders || []).map((ord) => (
                                <div
                                    key={ord._id}
                                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-extrabold text-sm text-orange-500">
                                                Order #{ord.orderNumber}
                                            </span>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${ord.fraudFlag?.riskLevel === "High"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-800"
                                                    }`}
                                            >
                                                {ord.fraudFlag?.riskLevel} Risk (Score:{" "}
                                                {ord.fraudFlag?.riskScore})
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold">
                                                Review: {ord.fraudFlag?.reviewStatus}
                                            </span>
                                        </div>

                                        <p className="text-xs font-semibold">
                                            Customer: {ord.user?.name} ({ord.user?.email}) • Amount:
                                            ₹{ord.pricing?.grandTotal} ({ord.paymentMethod})
                                        </p>

                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {(ord.fraudFlag?.reasons || []).map((reason, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-[11px] font-semibold"
                                                >
                                                    • {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleFraudOrderAction(ord._id, "approve")}
                                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Order
                                        </button>
                                        <button
                                            onClick={() => handleFraudOrderAction(ord._id, "reject")}
                                            className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Reject & Cancel
                                        </button>
                                        {ord.user?._id && (
                                            <button
                                                onClick={() =>
                                                    handleRestrictUser(
                                                        ord.user._id,
                                                        !ord.user.isRestricted
                                                    )
                                                }
                                                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                                            >
                                                {ord.user.isRestricted
                                                    ? "Unrestrict User"
                                                    : "Restrict Account"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODULE 3: TASK 2 - SEARCH ANALYTICS */}
            {activeTab === "search-analytics" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-extrabold text-lg">
                            Popular Search Queries & Redis Cache Performance
                        </h3>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <span className="text-[11px] text-slate-400 font-bold uppercase">
                                    Total Searches
                                </span>
                                <p className="text-xl font-extrabold text-orange-500">
                                    {overview?.searchAnalytics?.totalSearches || 0}
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <span className="text-[11px] text-slate-400 font-bold uppercase">
                                    Cache Hit Rate
                                </span>
                                <p className="text-xl font-extrabold text-emerald-500">
                                    {overview?.searchAnalytics?.cacheHitRatePercent || 0}%
                                </p>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                                <span className="text-[11px] text-slate-400 font-bold uppercase">
                                    Avg Latency
                                </span>
                                <p className="text-xl font-extrabold text-blue-500">
                                    {overview?.searchAnalytics?.avgLatencyMs || 12}ms
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {(overview?.searchAnalytics?.popularQueries || []).map((q) => (
                                <div
                                    key={q.query}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-bold"
                                >
                                    <span>"{q.query}"</span>
                                    <span className="text-orange-500">{q.count} searches</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-extrabold text-lg">Most Searched Cuisines</h3>
                        <div className="space-y-2.5">
                            {(overview?.searchAnalytics?.mostSearchedCuisines || []).map((c) => (
                                <div
                                    key={c.cuisine}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-bold"
                                >
                                    <span>{c.cuisine}</span>
                                    <span className="text-emerald-600">{c.count} queries</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODULE 4: TASK 3 - SURGE PRICING CONFIGURATION */}
            {activeTab === "surge" && surgeData?.settings && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-extrabold flex items-center gap-2">
                                <Zap className="w-6 h-6 text-orange-500" />
                                <span>Task 3: Dynamic Surge Pricing Engine Configuration</span>
                            </h2>
                            <p className="text-xs text-slate-500">
                                Configure base delivery fee, per-km rate, peak hours, and live
                                demand level overrides
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {["Normal", "Medium", "High", "Extreme"].map((lvl) => (
                                <button
                                    key={lvl}
                                    onClick={() =>
                                        handleUpdateSurge({
                                            manualDemandOverride: {
                                                enabled: true,
                                                level: lvl,
                                            },
                                        })
                                    }
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${surgeData.liveDemand?.demandLevel === lvl
                                            ? "bg-orange-500 text-white"
                                            : "bg-slate-100 dark:bg-slate-800"
                                        }`}
                                >
                                    Set {lvl} Demand
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Base Delivery Fee (₹)
                            </label>
                            <input
                                type="number"
                                value={surgeData.settings.baseDeliveryFee}
                                onChange={(e) =>
                                    handleUpdateSurge({
                                        baseDeliveryFee: Number(e.target.value),
                                    })
                                }
                                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Per Km Distance Fee (₹/km)
                            </label>
                            <input
                                type="number"
                                value={surgeData.settings.perKmRate}
                                onChange={(e) =>
                                    handleUpdateSurge({ perKmRate: Number(e.target.value) })
                                }
                                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Active Surge Multiplier
                            </span>
                            <p className="text-2xl font-extrabold text-orange-500">
                                {surgeData.liveDemand?.demandMultiplier || 1.0}x (
                                {surgeData.liveDemand?.demandLevel})
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* MODULE 5: TASK 4 - DELIVERY PARTNER MONITORING & REASSIGNMENT */}
            {activeTab === "delivery-assignments" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs text-slate-400 font-bold uppercase">
                                Available Riders
                            </span>
                            <p className="text-2xl font-extrabold text-emerald-500">
                                {deliveryData?.summary?.availableCount || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs text-slate-400 font-bold uppercase">
                                Busy Riders
                            </span>
                            <p className="text-2xl font-extrabold text-orange-500">
                                {deliveryData?.summary?.busyCount || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs text-slate-400 font-bold uppercase">
                                Active Assignments
                            </span>
                            <p className="text-2xl font-extrabold text-blue-500">
                                {deliveryData?.summary?.activeAssignmentsCount || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs text-slate-400 font-bold uppercase">
                                Failed / Unassigned
                            </span>
                            <p className="text-2xl font-extrabold text-red-500">
                                {deliveryData?.summary?.failedAssignmentsCount || 0}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-extrabold text-lg">
                            Active Delivery Assignments & Manual Reassignment Controls (Task 4)
                        </h3>
                        {(deliveryData?.assignments || []).map((a) => (
                            <div
                                key={a._id}
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                            >
                                <div>
                                    <span className="font-extrabold text-orange-500">
                                        Order #{a.order?.orderNumber}
                                    </span>{" "}
                                    • Status: <strong>{a.status}</strong>
                                    <p className="text-slate-500 mt-0.5">
                                        Assigned Partner:{" "}
                                        {a.deliveryPartner?.user?.name || "Unassigned"} • Distance:{" "}
                                        {a.distanceToRestaurantKm} km
                                    </p>
                                </div>
                                {a.order?._id && (
                                    <button
                                        onClick={() => handleReassignDelivery(a.order._id)}
                                        className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold cursor-pointer"
                                    >
                                        Reassign to Next Nearest Partner
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODULE 6: TASK 6 - RECOMMENDATION ANALYTICS */}
            {activeTab === "recommendations" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                        <h3 className="font-extrabold text-lg">
                            Most Recommended Restaurants (Task 6)
                        </h3>
                        {(overview?.recommendationAnalytics?.mostRecommendedRestaurants || []).map(
                            (r) => (
                                <div
                                    key={r._id}
                                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-bold"
                                >
                                    <span>
                                        {r.name} ({r.rating}★)
                                    </span>
                                    <span className="text-orange-500">
                                        {r.recommendationImpressions} impressions •{" "}
                                        {r.totalOrdersCompleted} orders
                                    </span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                        <h3 className="font-extrabold text-lg">
                            Cuisine Recommendation Performance
                        </h3>
                        {(overview?.recommendationAnalytics?.popularCuisines || []).map((c) => (
                            <div
                                key={c.cuisine}
                                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs font-bold"
                            >
                                <span>
                                    {c.cuisine} ({c.restaurantCount} kitchens)
                                </span>
                                <span className="text-emerald-600">
                                    Avg {c.avgRating}★ • {c.totalOrders} orders
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODULE 7: RESTAURANTS MANAGEMENT */}
            {activeTab === "restaurants" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <form
                        onSubmit={handleCreateRestaurant}
                        className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3 h-fit"
                    >
                        <h3 className="font-extrabold text-lg">Create New Restaurant</h3>
                        <input
                            type="text"
                            required
                            value={newRestaurant.name}
                            onChange={(e) =>
                                setNewRestaurant((p) => ({ ...p, name: e.target.value }))
                            }
                            placeholder="Restaurant Name"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                            type="text"
                            required
                            value={newRestaurant.cuisines}
                            onChange={(e) =>
                                setNewRestaurant((p) => ({ ...p, cuisines: e.target.value }))
                            }
                            placeholder="Cuisines (comma separated)"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <textarea
                            rows={2}
                            required
                            value={newRestaurant.description}
                            onChange={(e) =>
                                setNewRestaurant((p) => ({ ...p, description: e.target.value }))
                            }
                            placeholder="Description"
                            className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer"
                        >
                            Create Restaurant
                        </button>
                    </form>

                    <div className="lg:col-span-7 space-y-3">
                        {restaurants.map((r) => (
                            <div
                                key={r._id}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                                <div>
                                    <span className="font-bold text-sm">{r.name}</span>
                                    <p className="text-slate-500">
                                        {(r.cuisines || []).join(", ")} • {r.rating}★
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteRestaurant(r._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODULE 8: USERS MANAGEMENT */}
            {activeTab === "users" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">Platform Users ({users.length})</h3>
                    {users.map((u) => (
                        <div
                            key={u._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                            <div>
                                <span className="font-bold text-sm">{u.name}</span> ({u.email}) •{" "}
                                <span className="uppercase font-extrabold text-orange-500">
                                    {u.role}
                                </span>{" "}
                                • Risk Score: {u.riskScore || 0}
                            </div>
                            <button
                                onClick={() => handleRestrictUser(u._id, !u.isRestricted)}
                                className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer ${u.isRestricted
                                        ? "bg-emerald-600 text-white"
                                        : "bg-red-500 text-white"
                                    }`}
                            >
                                {u.isRestricted ? "Unrestrict" : "Restrict"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MODULE 9: ORDERS */}
            {activeTab === "orders" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">All Platform Orders ({orders.length})</h3>
                    {orders.map((o) => (
                        <div
                            key={o._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                            <div>
                                <span className="font-extrabold text-orange-500">
                                    #{o.orderNumber}
                                </span>{" "}
                                • {o.restaurant?.name} → {o.user?.name} •{" "}
                                <strong>{o.status}</strong>
                            </div>
                            <span className="font-extrabold">₹{o.pricing?.grandTotal}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* MODULE 10: REFUNDS */}
            {activeTab === "refunds" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">
                        Customer Refund Requests ({refunds.length})
                    </h3>
                    {refunds.map((ref) => (
                        <div
                            key={ref._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                            <div>
                                <span className="font-bold">
                                    Order #{ref.order?.orderNumber} • ₹{ref.amount}
                                </span>
                                <p className="text-slate-500">{ref.reason}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
                                    {ref.status}
                                </span>
                                {ref.status === "Pending" && (
                                    <>
                                        <button
                                            onClick={() =>
                                                handleProcessRefund(ref._id, "Processed")
                                            }
                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                                        >
                                            Approve & Refund
                                        </button>
                                        <button
                                            onClick={() => handleProcessRefund(ref._id, "Rejected")}
                                            className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold cursor-pointer"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODULE 11: COUPONS & REPORTS */}
            {activeTab === "reports" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <form
                        onSubmit={handleCreateCoupon}
                        className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3 h-fit"
                    >
                        <h3 className="font-extrabold text-lg">Create Promo Coupon</h3>
                        <input
                            type="text"
                            required
                            value={newCoupon.code}
                            onChange={(e) =>
                                setNewCoupon((p) => ({
                                    ...p,
                                    code: e.target.value.toUpperCase(),
                                }))
                            }
                            placeholder="Coupon Code (e.g. SUPER50)"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                            type="text"
                            required
                            value={newCoupon.title}
                            onChange={(e) =>
                                setNewCoupon((p) => ({ ...p, title: e.target.value }))
                            }
                            placeholder="Offer Title"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer"
                        >
                            Create Coupon
                        </button>
                    </form>

                    <div className="lg:col-span-7 space-y-3">
                        {coupons.map((c) => (
                            <div
                                key={c._id}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                                <div>
                                    <span className="font-extrabold text-orange-500">{c.code}</span>{" "}
                                    — {c.title} (Used {c.totalUsedCount} times)
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODULE 12: AUDIT LOGS */}
            {activeTab === "settings" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">
                        Administrator Security Audit Logs ({auditLogs.length})
                    </h3>
                    {auditLogs.map((log) => (
                        <div
                            key={log._id}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between text-xs"
                        >
                            <div>
                                <span className="font-extrabold text-orange-500">
                                    {log.action}
                                </span>{" "}
                                — {log.summary}
                            </div>
                            <span className="text-slate-400">
                                {new Date(log.createdAt).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;

