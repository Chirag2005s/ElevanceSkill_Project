import React, { useState, useEffect, useMemo } from "react";
import {
    LayoutDashboard,
    Users,
    Store,
    Search,
    ShoppingBag,
    ShieldAlert,
    ShieldCheck,
    Zap,
    Truck,
    RotateCcw,
    Sparkles,
    BarChart3,
    Settings,
    CheckCircle2,
    XCircle,
    Trash2,
    Menu,
    X,
    RefreshCw,
    AlertTriangle,
    Eye,
    Lock,
    Unlock,
    TrendingUp,
    Activity,
    Calendar,
    Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const SIDEBAR_GROUPS = [
    {
        group: "Core Overview",
        items: [
            {
                id: "overview",
                label: "Dashboard Overview",
                subtitle: "Revenue, KPIs & Risk Summary",
                icon: LayoutDashboard,
            },
        ],
    },
    {
        group: "Intelligent Engines",
        items: [
            {
                id: "fraud",
                label: "Fraud & Risk System",
                subtitle: "Task 1: High & Low Risk Engine",
                icon: ShieldAlert,
                badgeKey: "fraud",
            },
            {
                id: "search-analytics",
                label: "Search & Cache Engine",
                subtitle: "Task 2: Fuse.js & Redis Hits",
                icon: Search,
            },
            {
                id: "surge",
                label: "Dynamic Surge Pricing",
                subtitle: "Task 3: Peak & Demand Multipliers",
                icon: Zap,
            },
            {
                id: "delivery-assignments",
                label: "Geospatial Dispatch",
                subtitle: "Task 4: 2dsphere Rider Locking",
                icon: Truck,
            },
            {
                id: "recommendations",
                label: "Recommendation AI",
                subtitle: "Task 6: Taste Affinity & CTR",
                icon: Sparkles,
            },
        ],
    },
    {
        group: "Platform Operations",
        items: [
            {
                id: "restaurants",
                label: "Restaurants Directory",
                subtitle: "Manage Partner Kitchens",
                icon: Store,
            },
            {
                id: "users",
                label: "Users & Risk Profiles",
                subtitle: "RBAC, High/Low Risk & Bans",
                icon: Users,
            },
            {
                id: "orders",
                label: "All Orders & Risk",
                subtitle: "Live Order Lifecycle & Scores",
                icon: ShoppingBag,
            },
            {
                id: "table-bookings",
                label: "Table Bookings",
                subtitle: "Dine-In Reservations & Guests",
                icon: Calendar,
                badgeKey: "table-bookings",
            },
            {
                id: "refunds",
                label: "Refund Management",
                subtitle: "Customer Dispute Resolution",
                icon: RotateCcw,
            },
            {
                id: "reports",
                label: "Coupons & Promotions",
                subtitle: "Discount Codes & Campaigns",
                icon: BarChart3,
            },
            {
                id: "settings",
                label: "Security Audit Logs",
                subtitle: "Immutable Admin Action Trail",
                icon: Settings,
            },
        ],
    },
];

const classifyScoreToLevel = (score = 0) => {
    const num = Number(score) || 0;
    if (num > 70) return "High";
    if (num >= 50) return "Medium";
    return "Low";
};

const getRiskBadgeStyle = (level) => {
    if (level === "High") {
        return "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800";
    }
    if (level === "Medium") {
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800";
    }
    return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
};

const AdminDashboardPage = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [overview, setOverview] = useState(null);
    const [fraudData, setFraudData] = useState(null);
    const [fraudRiskFilter, setFraudRiskFilter] = useState("All"); // "All" | "High" | "Medium" | "Low"
    const [fraudStatusFilter, setFraudStatusFilter] = useState("All");
    const [selectedFraudDetail, setSelectedFraudDetail] = useState(null);
    const [loadingFraudDetail, setLoadingFraudDetail] = useState(false);
    const [localRiskOverrides, setLocalRiskOverrides] = useState({});

    const [surgeData, setSurgeData] = useState(null);
    const [deliveryData, setDeliveryData] = useState(null);
    const [users, setUsers] = useState([]);
    const [userRiskFilter, setUserRiskFilter] = useState("All"); // "All" | "High" | "Medium" | "Low"
    const [restaurants, setRestaurants] = useState([]);
    const [orders, setOrders] = useState([]);
    const [tableBookings, setTableBookings] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadTableBookingsFromStorage = () => {
        try {
            const collected = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("zingbite_bookings_")) {
                    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
                    if (Array.isArray(parsed)) {
                        for (const item of parsed) {
                            collected.push({
                                ...item,
                                storageKey: key,
                            });
                        }
                    }
                }
            }
            collected.sort(
                (a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            setTableBookings(collected);
        } catch {
            setTableBookings([]);
        }
    };

    const handleUpdateTableBookingStatus = (booking, newStatus) => {
        try {
            const key = booking.storageKey || `zingbite_bookings_${booking.restaurantId}`;
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const updated = existing.map((b) =>
                b.bookingId === booking.bookingId ? { ...b, status: newStatus } : b
            );
            localStorage.setItem(key, JSON.stringify(updated));
            loadTableBookingsFromStorage();
            toast.success(`Table booking ${booking.bookingId} marked as ${newStatus}`);
        } catch {
            toast.error("Could not update table booking status");
        }
    };

    const handleDeleteTableBooking = (booking) => {
        try {
            const key = booking.storageKey || `zingbite_bookings_${booking.restaurantId}`;
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const updated = existing.filter((b) => b.bookingId !== booking.bookingId);
            localStorage.setItem(key, JSON.stringify(updated));
            loadTableBookingsFromStorage();
            toast.success(`Table booking ${booking.bookingId} removed`);
        } catch {
            toast.error("Could not remove table booking");
        }
    };

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

    const loadAllAdminData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
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
            loadTableBookingsFromStorage();
            if (isManualRefresh) toast.success("Admin telemetry refreshed");
        } catch (err) {
            loadTableBookingsFromStorage();
            toast.error(err.response?.data?.message || "Failed to load admin console");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAllAdminData();
        loadTableBookingsFromStorage();
        const onStorageChange = () => loadTableBookingsFromStorage();
        window.addEventListener("storage", onStorageChange);
        window.addEventListener("focus", onStorageChange);
        return () => {
            window.removeEventListener("storage", onStorageChange);
            window.removeEventListener("focus", onStorageChange);
        };
    }, []);

    // Unified Orders list with complete High Risk (>70), Medium Risk (50-70), and Low Risk (0-49) classification
    const unifiedOrdersWithRisk = useMemo(() => {
        const map = new Map();
        for (const o of orders || []) {
            map.set(o._id, o);
        }
        for (const fo of fraudData?.orders || []) {
            map.set(fo._id, fo);
        }

        return Array.from(map.values())
            .map((ord) => {
                const override = localRiskOverrides[ord._id];
                const rawScore =
                    override?.riskScore !== undefined
                        ? override.riskScore
                        : Number(ord.fraudFlag?.riskScore ?? 12);
                const riskLevel =
                    override?.riskLevel ||
                    ord.fraudFlag?.riskLevel ||
                    classifyScoreToLevel(rawScore);
                const reviewStatus =
                    override?.reviewStatus ||
                    ord.fraudFlag?.reviewStatus ||
                    (riskLevel === "Low" ? "approved" : "pending_review");
                const reasons =
                    override?.reasons ||
                    (ord.fraudFlag?.reasons?.length
                        ? ord.fraudFlag.reasons
                        : riskLevel === "Low"
                        ? ["Normal order velocity • Verified payment & clean customer history"]
                        : ["Flagged by automated risk rule engine"]);

                return {
                    ...ord,
                    computedRiskScore: rawScore,
                    computedRiskLevel: riskLevel,
                    computedReviewStatus: reviewStatus,
                    computedReasons: reasons,
                };
            })
            .sort((a, b) => b.computedRiskScore - a.computedRiskScore);
    }, [orders, fraudData?.orders, localRiskOverrides]);

    const riskDistribution = useMemo(() => {
        let high = 0;
        let medium = 0;
        let low = 0;
        let pending = 0;

        for (const o of unifiedOrdersWithRisk) {
            if (o.computedRiskLevel === "High") high += 1;
            else if (o.computedRiskLevel === "Medium") medium += 1;
            else low += 1;

            if (o.computedReviewStatus === "pending_review") pending += 1;
        }

        const highRiskUsers = users.filter(
            (u) => (u.riskLevel || classifyScoreToLevel(u.riskScore)) === "High" || u.isRestricted
        ).length;
        const lowRiskUsers = users.filter(
            (u) => (u.riskLevel || classifyScoreToLevel(u.riskScore)) === "Low" && !u.isRestricted
        ).length;

        return {
            totalOrders: unifiedOrdersWithRisk.length,
            highOrders: high,
            mediumOrders: medium,
            lowOrders: low,
            pendingReview: pending,
            highRiskUsers,
            lowRiskUsers,
            restrictedUsersCount: users.filter((u) => u.isRestricted).length,
        };
    }, [unifiedOrdersWithRisk, users]);

    // Task 1 Handlers: Fraud Approve, Reject, Risk Tier Switch, User Restrict & Detail Inspection
    const handleInspectFraudOrder = async (orderId) => {
        setLoadingFraudDetail(true);
        try {
            const res = await api.get(`/admin/fraud/orders/${orderId}`);
            setSelectedFraudDetail(res.data?.data || null);
        } catch {
            toast.error("Could not load detailed fraud analysis");
        } finally {
            setLoadingFraudDetail(false);
        }
    };

    const handleFraudOrderAction = async (orderId, action) => {
        try {
            await api.patch(`/admin/fraud/orders/${orderId}/${action}`, {
                note: `Admin ${action}d order from Fraud & Risk Control Center`,
            });
            setLocalRiskOverrides((prev) => ({
                ...prev,
                [orderId]: {
                    ...(prev[orderId] || {}),
                    reviewStatus: action === "approve" ? "approved" : "rejected",
                    ...(action === "approve" ? { riskLevel: "Low", riskScore: 15 } : {}),
                },
            }));
            toast.success(
                action === "approve"
                    ? "Order approved and cleared as Low Risk!"
                    : "Suspicious High Risk order rejected and cancelled!"
            );
            if (selectedFraudDetail?.order?._id === orderId) {
                handleInspectFraudOrder(orderId);
            }
            loadAllAdminData();
        } catch {
            toast.error("Failed to process fraud order action");
        }
    };

    const handleSetOrderRiskTier = (ord, targetTier) => {
        const tierConfig = {
            High: {
                riskScore: 85,
                riskLevel: "High",
                reviewStatus: "pending_review",
                reasons: [
                    "Manually escalated to High Risk (>70) by Administrator for security review",
                ],
            },
            Medium: {
                riskScore: 58,
                riskLevel: "Medium",
                reviewStatus: "pending_review",
                reasons: ["Flagged as Medium Risk (50–70) for secondary verification"],
            },
            Low: {
                riskScore: 10,
                riskLevel: "Low",
                reviewStatus: "approved",
                reasons: ["Verified Low Risk (0–49) • Cleared by Administrator"],
            },
        };
        const cfg = tierConfig[targetTier] || tierConfig.Low;
        setLocalRiskOverrides((prev) => ({
            ...prev,
            [ord._id]: cfg,
        }));
        toast.success(`Order #${ord.orderNumber} set to ${targetTier} Risk (Score: ${cfg.riskScore})`);
    };

    const handleRestrictUser = async (userId, isRestricted, targetRiskLevel = null) => {
        try {
            await api.patch(`/admin/fraud/users/${userId}/restrict`, {
                isRestricted,
                reason: isRestricted
                    ? "High Risk score (>70) & suspicious activity detected"
                    : "Cleared to Low Risk by Administrator",
                durationHours: 48,
            });
            if (targetRiskLevel) {
                await api
                    .patch(`/admin/users/${userId}`, {
                        riskScore: targetRiskLevel === "High" ? 85 : 10,
                        riskLevel: targetRiskLevel,
                        isRestricted,
                    })
                    .catch(() => {});
            }
            toast.success(
                isRestricted
                    ? "User marked High Risk & account restricted (48h)"
                    : "User cleared to Low Risk & restriction lifted"
            );
            loadAllAdminData();
        } catch {
            toast.error("Could not update user risk & restriction status");
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
            <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-3 h-[640px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="lg:col-span-9 h-[640px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    const metrics = overview?.metrics || {};
    const allSidebarItems = SIDEBAR_GROUPS.flatMap((g) => g.items);
    const currentModule =
        allSidebarItems.find((item) => item.id === activeTab) || allSidebarItems[0];

    const filteredRiskOrders = unifiedOrdersWithRisk.filter(
        (ord) =>
            (fraudRiskFilter === "All" || ord.computedRiskLevel === fraudRiskFilter) &&
            (fraudStatusFilter === "All" || ord.computedReviewStatus === fraudStatusFilter)
    );

    const filteredUsers = users.filter((u) => {
        const lvl = u.riskLevel || classifyScoreToLevel(u.riskScore);
        if (userRiskFilter === "All") return true;
        return lvl === userRiskFilter;
    });

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-slate-100/70 dark:bg-slate-950 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
                />
            )}

            {/* LEFT SIDEBAR NAVIGATION */}
            <aside
                className={`fixed lg:sticky top-20 left-0 z-40 h-[calc(100vh-5rem)] w-72 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 shrink-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
            >
                {/* Sidebar Header */}
                <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                Admin Control Panel
                            </h2>
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Security Engine Active
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Sidebar Navigation Groups */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
                    {SIDEBAR_GROUPS.map((grp) => (
                        <div key={grp.group} className="space-y-1">
                            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                                {grp.group}
                            </span>
                            {grp.items.map((mod) => {
                                const Icon = mod.icon;
                                const isActive = activeTab === mod.id;
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => {
                                            setActiveTab(mod.id);
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full px-3.5 py-2.5 rounded-2xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25"
                                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon
                                                className={`w-4 h-4 shrink-0 ${
                                                    isActive ? "text-white" : "text-orange-500"
                                                }`}
                                            />
                                            <div className="truncate">
                                                <span className="text-xs font-extrabold block truncate">
                                                    {mod.label}
                                                </span>
                                                <span
                                                    className={`text-[10px] block truncate ${
                                                        isActive
                                                            ? "text-orange-100"
                                                            : "text-slate-400"
                                                    }`}
                                                >
                                                    {mod.subtitle}
                                                </span>
                                            </div>
                                        </div>

                                        {mod.badgeKey === "fraud" && (
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                                    isActive
                                                        ? "bg-white text-orange-600"
                                                        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                                }`}
                                            >
                                                {riskDistribution.highOrders} High
                                            </span>
                                        )}

                                        {mod.badgeKey === "table-bookings" && (
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                                    isActive
                                                        ? "bg-white text-orange-600"
                                                        : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                                                }`}
                                            >
                                                {tableBookings.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Sidebar Bottom High Risk / Low Risk Live Monitor Widget */}
                <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        <span>Live Risk Monitor</span>
                        <Activity className="w-3.5 h-3.5 text-orange-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("fraud");
                                setFraudRiskFilter("High");
                                setSidebarOpen(false);
                            }}
                            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-left cursor-pointer hover:border-red-400 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase block">
                                High Risk (&gt;70)
                            </span>
                            <span className="text-lg font-extrabold text-red-700 dark:text-red-300">
                                {riskDistribution.highOrders} Orders
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab("fraud");
                                setFraudRiskFilter("Low");
                                setSidebarOpen(false);
                            }}
                            className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-left cursor-pointer hover:border-emerald-400 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                                Low Risk (0–49)
                            </span>
                            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                                {riskDistribution.lowOrders} Clean
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN WORKSPACE CONTENT */}
            <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
                {/* Top Command Header Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-[10px] font-extrabold uppercase tracking-wider">
                                    ZingBite Enterprise Admin
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                                    High &amp; Low Risk Shield Active
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
                                {currentModule.label}
                            </h1>
                            <p className="text-xs text-slate-300 mt-0.5">
                                {currentModule.subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => {
                                setActiveTab("fraud");
                                setFraudRiskFilter("High");
                            }}
                            className="px-3.5 py-2 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <div className="text-left">
                                <span className="text-[10px] text-red-200 block">High Risk Queue</span>
                                <span className="font-extrabold text-white">
                                    {riskDistribution.highOrders} Flagged
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab("fraud");
                                setFraudRiskFilter("Low");
                            }}
                            className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <div className="text-left">
                                <span className="text-[10px] text-emerald-200 block">Low Risk Orders</span>
                                <span className="font-extrabold text-white">
                                    {riskDistribution.lowOrders} Verified
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab("table-bookings")}
                            className="px-3.5 py-2 rounded-2xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <Calendar className="w-4 h-4 text-orange-400" />
                            <div className="text-left">
                                <span className="text-[10px] text-orange-200 block">
                                    Table Bookings
                                </span>
                                <span className="font-extrabold text-white">
                                    {tableBookings.length} Booked
                                </span>
                            </div>
                        </button>

                        <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs">
                            <span className="text-[10px] text-slate-300 block">Live Surge</span>
                            <span className="font-extrabold text-orange-400">
                                {overview?.liveSurgeStatus?.demandLevel || "Normal"} (
                                {overview?.liveSurgeStatus?.surgeMultiplier || 1}x)
                            </span>
                        </div>

                        <button
                            onClick={() => loadAllAdminData(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white cursor-pointer transition-colors"
                            title="Refresh Live Telemetry"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* MODULE 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Top KPI Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Total Revenue",
                                    val: `₹${metrics.totalRevenue || 0}`,
                                    color: "text-emerald-600",
                                },
                                {
                                    label: "Avg Order Value",
                                    val: `₹${metrics.averageOrderValue || 0}`,
                                    color: "text-blue-600",
                                },
                                {
                                    label: "Total Orders",
                                    val: metrics.totalOrders || unifiedOrdersWithRisk.length,
                                    color: "text-orange-500",
                                },
                                {
                                    label: "Completed / Cancelled",
                                    val: `${metrics.completedOrders || 0} / ${metrics.cancelledOrders || 0}`,
                                    color: "text-slate-800 dark:text-white",
                                },
                                {
                                    label: "High Risk Orders (>70)",
                                    val: riskDistribution.highOrders,
                                    color: "text-red-600",
                                },
                                {
                                    label: "Low Risk Orders (0–49)",
                                    val: riskDistribution.lowOrders,
                                    color: "text-emerald-600",
                                },
                                {
                                    label: "Partner Restaurants",
                                    val: metrics.totalRestaurants || restaurants.length,
                                    color: "text-slate-800 dark:text-white",
                                },
                                {
                                    label: "Delivery Riders",
                                    val: metrics.totalDeliveryPartners || 0,
                                    color: "text-slate-800 dark:text-white",
                                },
                                {
                                    label: "Table Bookings (Dine-In)",
                                    val: tableBookings.length,
                                    color: "text-orange-500",
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
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

                        {/* High Risk vs. Low Risk Platform Overview Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-extrabold text-base flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                                        <span>Platform High Risk vs. Low Risk Security Breakdown</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Automated scoring across all orders and customer profiles
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab("fraud")}
                                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold cursor-pointer self-start sm:self-auto"
                                >
                                    Open Fraud &amp; Risk Center →
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-extrabold">
                                            HIGH RISK (Score &gt; 70)
                                        </span>
                                        <span className="text-lg font-extrabold text-red-600">
                                            {riskDistribution.highOrders} Orders
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        Triggered by rapid orders (+40), coupon abuse (+30), repeated failed
                                        payments (+25), or excessive cancellations (+20). Held for admin
                                        approval.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-extrabold">
                                            MEDIUM RISK (Score 50–70)
                                        </span>
                                        <span className="text-lg font-extrabold text-amber-600">
                                            {riskDistribution.mediumOrders} Orders
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        Moderate anomaly score. Monitored in the admin queue with one-click
                                        Approve or Reject &amp; Cancel controls.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold">
                                            LOW RISK (Score 0–49)
                                        </span>
                                        <span className="text-lg font-extrabold text-emerald-600">
                                            {riskDistribution.lowOrders} Orders
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        Verified clean customer behavior ({riskDistribution.lowRiskUsers}{" "}
                                        Low-Risk Users). Auto-approved for immediate kitchen preparation.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Dine-In Table Bookings Card in Overview */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="font-extrabold text-base flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-orange-500" />
                                        <span>
                                            Recent Dine-In Table Bookings ({tableBookings.length})
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Customer table reservations booked from Restaurant pages
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab("table-bookings")}
                                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold cursor-pointer self-start sm:self-auto"
                                >
                                    Manage All Table Bookings →
                                </button>
                            </div>

                            {tableBookings.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                    No table reservations booked yet. Book a table on any Restaurant
                                    page to see it here!
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {tableBookings.slice(0, 4).map((bk) => (
                                        <div
                                            key={bk.bookingId}
                                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-extrabold">
                                                        {bk.bookingId}
                                                    </span>
                                                    <span className="font-extrabold text-slate-900 dark:text-white">
                                                        {bk.restaurantName}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                                            bk.status === "Cancelled"
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-emerald-100 text-emerald-700"
                                                        }`}
                                                    >
                                                        {bk.status || "Confirmed"}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 font-semibold">
                                                    Guest: {bk.guestName} ({bk.guestPhone}) •{" "}
                                                    {bk.guests} Guest(s)
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {bk.date} at {bk.time} • {bk.seatingType}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab("table-bookings")}
                                                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer shrink-0"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                                <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span>Top Revenue Generating Restaurants</span>
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

                {/* MODULE 2: TASK 1 - FRAUD DETECTION & HIGH/LOW RISK SYSTEM */}
                {activeTab === "fraud" && (
                    <div className="space-y-6">
                        {/* High Risk / Medium Risk / Low Risk Interactive Filter Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div
                                onClick={() => setFraudRiskFilter("All")}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                    fraudRiskFilter === "All"
                                        ? "border-orange-500 bg-orange-50/40 dark:bg-orange-950/20"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                }`}
                            >
                                <span className="text-[11px] font-extrabold uppercase text-slate-400">
                                    All Monitored Orders
                                </span>
                                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                                    {riskDistribution.totalOrders}
                                </p>
                                <span className="text-[11px] text-slate-500 block mt-1">
                                    Click to view High, Medium &amp; Low Risk
                                </span>
                            </div>

                            <div
                                onClick={() => setFraudRiskFilter("High")}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                    fraudRiskFilter === "High"
                                        ? "border-red-500 bg-red-50/50 dark:bg-red-950/30"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold uppercase text-red-600">
                                        High Risk (Score &gt; 70)
                                    </span>
                                    <ShieldAlert className="w-4 h-4 text-red-500" />
                                </div>
                                <p className="text-2xl font-extrabold text-red-600 mt-1">
                                    {riskDistribution.highOrders} Orders
                                </p>
                                <span className="text-[11px] text-red-500 font-semibold block mt-1">
                                    Requires Admin Approval / Reject
                                </span>
                            </div>

                            <div
                                onClick={() => setFraudRiskFilter("Medium")}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                    fraudRiskFilter === "Medium"
                                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold uppercase text-amber-600">
                                        Medium Risk (50–70)
                                    </span>
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <p className="text-2xl font-extrabold text-amber-600 mt-1">
                                    {riskDistribution.mediumOrders} Orders
                                </p>
                                <span className="text-[11px] text-amber-600 font-semibold block mt-1">
                                    Secondary Verification Queue
                                </span>
                            </div>

                            <div
                                onClick={() => setFraudRiskFilter("Low")}
                                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                    fraudRiskFilter === "Low"
                                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold uppercase text-emerald-600">
                                        Low Risk (Score 0–49)
                                    </span>
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                </div>
                                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                                    {riskDistribution.lowOrders} Orders
                                </p>
                                <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                                    Clean &amp; Auto-Verified Orders
                                </span>
                            </div>
                        </div>

                        {/* Risk Rule Matrix Reference */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                                Backend Risk Scoring Rules (0–49 Low Risk | 50–70 Medium Risk | &gt;70 High Risk)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                                {[
                                    { rule: "Rapid Orders (≥3 in 15m)", pts: "+40 pts" },
                                    { rule: ">3 Cancellations / Day", pts: "+20 pts" },
                                    { rule: ">5 Coupon Uses / Day", pts: "+30 pts" },
                                    { rule: ">3 Refund Requests", pts: "+20 pts" },
                                    { rule: "≥3 Failed Payments", pts: "+25 pts" },
                                    { rule: "High-Value COD (≥₹2500)", pts: "+15 pts" },
                                ].map((r) => (
                                    <div
                                        key={r.rule}
                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2"
                                    >
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                            {r.rule}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold shrink-0">
                                            {r.pts}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detailed Fraud Order Analysis Panel (GET /api/admin/fraud/orders/:orderId) */}
                        {(selectedFraudDetail || loadingFraudDetail) && (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-orange-500 shadow-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                        Detailed Fraud Analysis — Order #{selectedFraudDetail?.order?.orderNumber}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedFraudDetail(null)}
                                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>

                                {loadingFraudDetail ? (
                                    <p className="text-xs text-slate-500">Loading fraud evaluation history...</p>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
                                            <h4 className="font-extrabold text-sm text-orange-500">
                                                Order &amp; Customer Risk Profile
                                            </h4>
                                            <p>
                                                <strong>Customer:</strong> {selectedFraudDetail?.order?.user?.name} (
                                                {selectedFraudDetail?.order?.user?.email})
                                            </p>
                                            <p>
                                                <strong>Risk Score &amp; Level:</strong>{" "}
                                                {selectedFraudDetail?.order?.fraudFlag?.riskScore || 10} (
                                                {selectedFraudDetail?.order?.fraudFlag?.riskLevel || "Low"} Risk)
                                            </p>
                                            <p>
                                                <strong>Review Status:</strong>{" "}
                                                {selectedFraudDetail?.order?.fraudFlag?.reviewStatus}
                                            </p>
                                            <p>
                                                <strong>Account Restricted:</strong>{" "}
                                                {selectedFraudDetail?.order?.user?.isRestricted ? "Yes" : "No"}
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
                                            <h4 className="font-extrabold text-sm text-red-500">
                                                Customer Fraud Activity Log (
                                                {(selectedFraudDetail?.userActivities || []).length})
                                            </h4>
                                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                                {(selectedFraudDetail?.userActivities || []).length === 0 ? (
                                                    <p className="text-slate-500">
                                                        No suspicious behavioral triggers recorded (Low Risk profile).
                                                    </p>
                                                ) : (
                                                    (selectedFraudDetail?.userActivities || []).map((act) => (
                                                        <div
                                                            key={act._id}
                                                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                                                        >
                                                            <div>
                                                                <span className="font-bold text-red-600 block">
                                                                    {act.activityType} (+{act.pointsAdded} pts)
                                                                </span>
                                                                <span className="text-[11px] text-slate-500">
                                                                    {act.reason}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                {new Date(act.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Unified High Risk & Low Risk Orders Management Queue */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                                        <ShieldAlert className="w-6 h-6 text-orange-500" />
                                        <span>
                                            High Risk &amp; Low Risk Order Classification Queue (
                                            {filteredRiskOrders.length})
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Approve, reject, inspect, or reclassify orders between High Risk,
                                        Medium Risk, and Low Risk
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {["All", "High", "Medium", "Low"].map((tier) => (
                                        <button
                                            key={tier}
                                            type="button"
                                            onClick={() => setFraudRiskFilter(tier)}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer transition-colors ${
                                                fraudRiskFilter === tier
                                                    ? "bg-orange-500 text-white border-orange-500"
                                                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                            }`}
                                        >
                                            {tier === "All" ? "All Tiers" : `${tier} Risk`}
                                        </button>
                                    ))}

                                    <select
                                        value={fraudStatusFilter}
                                        onChange={(e) => setFraudStatusFilter(e.target.value)}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="pending_review">Pending Review</option>
                                        <option value="approved">Approved / Clean</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                {filteredRiskOrders.map((ord) => {
                                    const score = ord.computedRiskScore;
                                    const level = ord.computedRiskLevel;
                                    return (
                                        <div
                                            key={ord._id}
                                            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-2 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-extrabold text-sm text-orange-500">
                                                        Order #{ord.orderNumber}
                                                    </span>
                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getRiskBadgeStyle(
                                                            level
                                                        )}`}
                                                    >
                                                        {level.toUpperCase()} RISK • Score: {score}/100
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold">
                                                        Review: {ord.computedReviewStatus}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                                                        {ord.status}
                                                    </span>
                                                </div>

                                                {/* Visual Risk Score Meter Bar */}
                                                <div className="w-full max-w-md bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${
                                                            level === "High"
                                                                ? "bg-red-600"
                                                                : level === "Medium"
                                                                ? "bg-amber-500"
                                                                : "bg-emerald-500"
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, Math.max(8, score))}%`,
                                                        }}
                                                    />
                                                </div>

                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                    Customer: {ord.user?.name || "Customer"} (
                                                    {ord.user?.email || "verified@zingbite.com"}) • Kitchen:{" "}
                                                    {ord.restaurant?.name || "Partner Kitchen"} • Amount: ₹
                                                    {ord.pricing?.grandTotal} ({ord.paymentMethod})
                                                </p>

                                                <div className="flex flex-wrap gap-1.5">
                                                    {(ord.computedReasons || []).map((reason, i) => (
                                                        <span
                                                            key={i}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                                                                level === "Low"
                                                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                                                    : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300"
                                                            }`}
                                                        >
                                                            • {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Admin Risk Action Controls */}
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleInspectFraudOrder(ord._id)}
                                                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> Inspect
                                                </button>

                                                <button
                                                    onClick={() => handleFraudOrderAction(ord._id, "approve")}
                                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve (Low Risk)
                                                </button>

                                                <button
                                                    onClick={() => handleFraudOrderAction(ord._id, "reject")}
                                                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Reject Order
                                                </button>

                                                {/* Quick Risk Level Classifier Dropdown */}
                                                <select
                                                    value={level}
                                                    onChange={(e) =>
                                                        handleSetOrderRiskTier(ord, e.target.value)
                                                    }
                                                    className="px-2.5 py-2 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 cursor-pointer"
                                                    title="Reclassify Order Risk Level"
                                                >
                                                    <option value="Low">Set Low Risk (10)</option>
                                                    <option value="Medium">Set Medium Risk (58)</option>
                                                    <option value="High">Set High Risk (85)</option>
                                                </select>

                                                {ord.user?._id && (
                                                    <button
                                                        onClick={() =>
                                                            handleRestrictUser(
                                                                ord.user._id,
                                                                !ord.user.isRestricted,
                                                                !ord.user.isRestricted ? "High" : "Low"
                                                            )
                                                        }
                                                        className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                                                    >
                                                        {ord.user.isRestricted
                                                            ? "Unrestrict User"
                                                            : "Restrict User"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* High-Risk & Low-Risk Customer Accounts + Behavioral Activity Stream */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                                <h3 className="font-extrabold text-base">
                                    Customer High Risk vs. Low Risk Account Control
                                </h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {users.map((u) => {
                                        const uScore = Number(u.riskScore || 0);
                                        const uLevel = u.riskLevel || classifyScoreToLevel(uScore);
                                        return (
                                            <div
                                                key={u._id}
                                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-sm">{u.name}</span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] border ${getRiskBadgeStyle(
                                                                uLevel
                                                            )}`}
                                                        >
                                                            {uLevel} Risk (Score: {uScore})
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 mt-0.5">{u.email}</p>
                                                    {u.restrictionReason && (
                                                        <p className="text-[11px] text-red-500 mt-0.5">
                                                            Reason: {u.restrictionReason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() =>
                                                            handleRestrictUser(
                                                                u._id,
                                                                !u.isRestricted,
                                                                !u.isRestricted ? "High" : "Low"
                                                            )
                                                        }
                                                        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer flex items-center gap-1 ${
                                                            u.isRestricted
                                                                ? "bg-emerald-600 text-white"
                                                                : "bg-red-600 text-white"
                                                        }`}
                                                    >
                                                        {u.isRestricted ? (
                                                            <>
                                                                <Unlock className="w-3 h-3" /> Set Low Risk
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="w-3 h-3" /> Flag High Risk
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                                <h3 className="font-extrabold text-base">
                                    Recent Behavioral Fraud Activity Log
                                </h3>
                                <div className="space-y-2.5 max-h-80 overflow-y-auto">
                                    {(fraudData?.recentActivities || []).map((act) => (
                                        <div
                                            key={act._id}
                                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between gap-2"
                                        >
                                            <div>
                                                <span className="font-extrabold text-red-500">
                                                    {act.activityType} (+{act.pointsAdded} pts)
                                                </span>
                                                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                    {act.user?.name || "Customer"}: {act.reason}
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {new Date(act.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODULE 3: TASK 2 - SEARCH ANALYTICS */}
                {activeTab === "search-analytics" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <h3 className="font-extrabold text-lg">
                                Popular Search Queries &amp; Redis Cache Performance
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
                                        <span>&quot;{q.query}&quot;</span>
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

                            <div className="flex flex-wrap items-center gap-2">
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
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                                            surgeData.liveDemand?.demandLevel === lvl
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
                                Active Delivery Assignments &amp; Manual Reassignment Controls (Task 4)
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
                            {(
                                overview?.recommendationAnalytics?.mostRecommendedRestaurants || []
                            ).map((r) => (
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
                            ))}
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                            <h3 className="font-extrabold text-lg">
                                Cuisine Recommendation Performance
                            </h3>
                            {(overview?.recommendationAnalytics?.popularCuisines || []).map(
                                (c) => (
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
                                )
                            )}
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
                                    setNewRestaurant((p) => ({
                                        ...p,
                                        description: e.target.value,
                                    }))
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

                {/* MODULE 8: USERS & HIGH/LOW RISK PROFILES */}
                {activeTab === "users" && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-extrabold text-lg">
                                    Platform Users &amp; Risk Classification ({filteredUsers.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Monitor Low Risk (0–49), Medium Risk (50–70), and High Risk (&gt;70)
                                    accounts
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {["All", "High", "Medium", "Low"].map((tier) => (
                                    <button
                                        key={tier}
                                        type="button"
                                        onClick={() => setUserRiskFilter(tier)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                                            userRiskFilter === tier
                                                ? "bg-orange-500 text-white border-orange-500"
                                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                        }`}
                                    >
                                        {tier === "All" ? "All Users" : `${tier} Risk`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredUsers.map((u) => {
                                const score = Number(u.riskScore || 0);
                                const level = u.riskLevel || classifyScoreToLevel(score);
                                return (
                                    <div
                                        key={u._id}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-sm">{u.name}</span>
                                                <span className="text-slate-500">({u.email})</span>
                                                <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 uppercase font-extrabold text-[10px]">
                                                    {u.role}
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${getRiskBadgeStyle(
                                                        level
                                                    )}`}
                                                >
                                                    {level} Risk • Score: {score}
                                                </span>
                                            </div>
                                            {u.restrictionReason && (
                                                <p className="text-[11px] text-red-500">
                                                    Restriction: {u.restrictionReason}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() =>
                                                    handleRestrictUser(
                                                        u._id,
                                                        !u.isRestricted,
                                                        !u.isRestricted ? "High" : "Low"
                                                    )
                                                }
                                                className={`px-3.5 py-1.5 rounded-xl font-bold cursor-pointer ${
                                                    u.isRestricted
                                                        ? "bg-emerald-600 text-white"
                                                        : "bg-red-500 text-white"
                                                }`}
                                            >
                                                {u.isRestricted
                                                    ? "Set Low Risk & Unrestrict"
                                                    : "Flag High Risk & Restrict"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* MODULE 9: ALL ORDERS & RISK STATUS */}
                {activeTab === "orders" && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-extrabold text-lg">
                                    All Platform Orders with Risk Classification (
                                    {unifiedOrdersWithRisk.length})
                                </h3>
                            </div>
                            <div className="space-y-3">
                                {unifiedOrdersWithRisk.map((o) => (
                                    <div
                                        key={o._id}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-extrabold text-orange-500">
                                                #{o.orderNumber}
                                            </span>
                                            <span>
                                                • {o.restaurant?.name} → {o.user?.name} •{" "}
                                                <strong>{o.status}</strong>
                                            </span>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${getRiskBadgeStyle(
                                                    o.computedRiskLevel
                                                )}`}
                                            >
                                                {o.computedRiskLevel} Risk ({o.computedRiskScore})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-extrabold text-sm">
                                                ₹{o.pricing?.grandTotal}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setActiveTab("fraud");
                                                    setFraudRiskFilter(o.computedRiskLevel);
                                                }}
                                                className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                                            >
                                                Manage Risk
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Table Bookings also displayed inside Orders tab */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-extrabold text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-orange-500" />
                                    <span>
                                        Dine-In Table Bookings ({tableBookings.length})
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setActiveTab("table-bookings")}
                                    className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                                >
                                    Open Table Bookings Manager →
                                </button>
                            </div>
                            {tableBookings.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                    No table reservations booked yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {tableBookings.map((bk) => (
                                        <div
                                            key={bk.bookingId}
                                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-extrabold text-orange-500">
                                                    #{bk.bookingId}
                                                </span>
                                                <span>
                                                    • <strong>{bk.restaurantName}</strong> →{" "}
                                                    {bk.guestName} ({bk.guestPhone}) • {bk.guests}{" "}
                                                    Guest(s) • {bk.date} at {bk.time} ({bk.seatingType})
                                                </span>
                                            </div>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                                    bk.status === "Cancelled"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-emerald-100 text-emerald-700"
                                                }`}
                                            >
                                                {bk.status || "Confirmed"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODULE 9B: TABLE BOOKINGS MANAGEMENT */}
                {activeTab === "table-bookings" && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-extrabold text-xl flex items-center gap-2">
                                    <Calendar className="w-6 h-6 text-orange-500" />
                                    <span>
                                        Dine-In Table Reservations Management ({tableBookings.length})
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    View, confirm, mark seated, or cancel customer table reservations
                                    across all Bengaluru partner restaurants
                                </p>
                            </div>
                            <button
                                onClick={loadTableBookingsFromStorage}
                                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Refresh Bookings</span>
                            </button>
                        </div>

                        {tableBookings.length === 0 ? (
                            <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center space-y-2">
                                <Calendar className="w-8 h-8 text-orange-500 mx-auto" />
                                <h4 className="font-bold text-sm">
                                    No Table Reservations Found Yet
                                </h4>
                                <p className="text-xs text-slate-500">
                                    When a customer books a table on any Restaurant page, it will
                                    appear here automatically.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3.5">
                                {tableBookings.map((bk) => (
                                    <div
                                        key={bk.bookingId}
                                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-md bg-orange-500 text-white font-extrabold">
                                                    #{bk.bookingId}
                                                </span>
                                                <span className="font-extrabold text-base text-slate-900 dark:text-white">
                                                    {bk.restaurantName}
                                                </span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                                                        bk.status === "Cancelled"
                                                            ? "bg-red-100 text-red-700"
                                                            : bk.status === "Seated / Completed"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-emerald-100 text-emerald-700"
                                                    }`}
                                                >
                                                    {bk.status || "Confirmed"}
                                                </span>
                                            </div>

                                            <p className="font-semibold text-slate-700 dark:text-slate-200 flex flex-wrap items-center gap-2">
                                                <span>
                                                    Guest: <strong>{bk.guestName}</strong>
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3.5 h-3.5 text-orange-500" />
                                                    {bk.guestPhone}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    <strong>{bk.guests}</strong>{" "}
                                                    {bk.guests === 1 ? "Guest" : "Guests"}
                                                </span>
                                                <span>•</span>
                                                <span>Seating: {bk.seatingType}</span>
                                            </p>

                                            <p className="text-slate-500 dark:text-slate-400">
                                                Reservation Slot: <strong>{bk.date}</strong> at{" "}
                                                <strong>{bk.time}</strong>
                                                {bk.specialRequest
                                                    ? ` • Special Note: "${bk.specialRequest}"`
                                                    : ""}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <button
                                                onClick={() =>
                                                    handleUpdateTableBookingStatus(bk, "Confirmed")
                                                }
                                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleUpdateTableBookingStatus(
                                                        bk,
                                                        "Seated / Completed"
                                                    )
                                                }
                                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                                            >
                                                Mark Seated
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleUpdateTableBookingStatus(bk, "Cancelled")
                                                }
                                                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1 cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" /> Cancel
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTableBooking(bk)}
                                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                                title="Delete Booking"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                                                Approve &amp; Refund
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleProcessRefund(ref._id, "Rejected")
                                                }
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
                                        <span className="font-extrabold text-orange-500">
                                            {c.code}
                                        </span>{" "}
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
        </div>
    );
};

export default AdminDashboardPage;
