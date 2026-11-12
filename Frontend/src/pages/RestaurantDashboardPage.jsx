import React, { useState, useEffect } from "react";
import {
    Store,
    Utensils,
    ShoppingBag,
    Clock,
    Star,
    BarChart3,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    ChefHat,
    PackageCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { getSocket, connectSocket } from "../services/socket";

const TABS = [
    { id: "overview", label: "Overview", icon: Store },
    { id: "incoming", label: "Incoming Orders", icon: ShoppingBag },
    { id: "menu", label: "Menu Management", icon: Utensils },
    { id: "history", label: "Order History", icon: Clock },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "profile", label: "Restaurant Profile", icon: Store },
];

const RestaurantDashboardPage = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    // New Food Item state
    const [newFood, setNewFood] = useState({
        name: "",
        description: "",
        price: 249,
        categoryName: "Recommended",
        isVeg: true,
        spiceLevel: "Medium",
        preparationTimeMinutes: 15,
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
    });

    // Profile Edit state
    const [profileForm, setProfileForm] = useState({
        name: "",
        description: "",
        cuisines: "",
        avgPriceForTwo: 400,
        deliveryTimeMinutes: 25,
        offerText: "",
        isOpen: true,
    });

    const fetchDashboard = async () => {
        try {
            const res = await api.get("/restaurants/owner/dashboard");
            if (res.data?.data) {
                setDashboard(res.data.data);
                const r = res.data.data.restaurant;
                if (r) {
                    setProfileForm({
                        name: r.name || "",
                        description: r.description || "",
                        cuisines: (r.cuisines || []).join(", "),
                        avgPriceForTwo: r.avgPriceForTwo || 400,
                        deliveryTimeMinutes: r.deliveryTimeMinutes || 25,
                        offerText: r.offerText || "",
                        isOpen: Boolean(r.isOpen),
                    });
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load restaurant dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    useEffect(() => {
        if (!dashboard?.restaurant?._id) return;
        const socket = getSocket() || connectSocket();
        socket.emit("restaurant:join", dashboard.restaurant._id);

        const handleNewOrder = () => {
            toast.success("New incoming customer order received!");
            fetchDashboard();
        };

        socket.on("restaurant:new_order", handleNewOrder);
        socket.on("restaurant:order_updated", fetchDashboard);
        return () => {
            socket.off("restaurant:new_order", handleNewOrder);
            socket.off("restaurant:order_updated", fetchDashboard);
        };
    }, [dashboard?.restaurant?._id]);

    const handleOrderStatusUpdate = async (orderId, nextStatus) => {
        try {
            const res = await api.patch(`/orders/update-status/${orderId}`, {
                status: nextStatus,
            });
            toast.success(`Order updated to '${nextStatus}'`);
            if (res.data?.data?.deliveryAssignment?.assigned) {
                toast.success("Smart Delivery Engine automatically assigned a nearby rider!");
            }
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        }
    };

    const handleAddFoodItem = async (e) => {
        e.preventDefault();
        if (!newFood.name || !newFood.description) {
            toast.error("Please enter dish name and description");
            return;
        }
        try {
            await api.post("/foods", {
                ...newFood,
                restaurantId: dashboard.restaurant._id,
            });
            toast.success("Dish added to menu!");
            setNewFood({
                name: "",
                description: "",
                price: 249,
                categoryName: "Recommended",
                isVeg: true,
                spiceLevel: "Medium",
                preparationTimeMinutes: 15,
                image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
            });
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not add food item");
        }
    };

    const handleToggleFoodAvailability = async (food) => {
        try {
            await api.put(`/foods/${food._id}`, { isAvailable: !food.isAvailable });
            toast.success(`${food.name} marked ${!food.isAvailable ? "In Stock" : "Out of Stock"}`);
            fetchDashboard();
        } catch {
            toast.error("Failed to update dish availability");
        }
    };

    const handleDeleteFood = async (foodId) => {
        try {
            await api.delete(`/foods/${foodId}`);
            toast.success("Dish deleted from menu");
            fetchDashboard();
        } catch {
            toast.error("Could not delete dish");
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/restaurants/${dashboard.restaurant._id}`, profileForm);
            toast.success("Restaurant profile updated!");
            fetchDashboard();
        } catch {
            toast.error("Failed to update restaurant profile");
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    const { restaurant, stats, foods = [], orders = [], reviews = [] } = dashboard || {};
    const incomingOrders = orders.filter((o) =>
        [
            "Order Placed",
            "Restaurant Accepted",
            "Delivery Partner Assigned",
            "Food Preparing",
            "Ready for Pickup",
        ].includes(o.status)
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-orange-950 text-white rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                        Restaurant Owner Portal
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                        {restaurant?.name || "Partner Kitchen"}
                    </h1>
                    <p className="text-xs text-slate-300 mt-1">
                        {restaurant?.address?.street}, {restaurant?.address?.area} •{" "}
                        {restaurant?.rating}★ ({restaurant?.totalRatings} ratings)
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            await api.put(`/restaurants/${restaurant._id}`, {
                                isOpen: !restaurant.isOpen,
                            });
                            toast.success(
                                `Restaurant is now ${!restaurant.isOpen ? "OPEN" : "CLOSED"}`
                            );
                            fetchDashboard();
                        }}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs cursor-pointer ${restaurant?.isOpen
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                    >
                        {restaurant?.isOpen ? "● Accepting Orders (OPEN)" : "● Kitchen Closed"}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
                {TABS.map((t) => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${activeTab === t.id
                                    ? "bg-orange-500 text-white shadow-sm"
                                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{t.label}</span>
                            {t.id === "incoming" && incomingOrders.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-white text-orange-600 text-[10px] font-extrabold">
                                    {incomingOrders.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === "overview" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Total Kitchen Revenue
                            </span>
                            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                                ₹{stats?.totalRevenue || 0}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Active Incoming Orders
                            </span>
                            <p className="text-2xl font-extrabold text-orange-500 mt-1">
                                {incomingOrders.length}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Completed Orders
                            </span>
                            <p className="text-2xl font-extrabold mt-1">
                                {stats?.completedOrdersCount || 0}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Menu Dishes
                            </span>
                            <p className="text-2xl font-extrabold mt-1">
                                {stats?.totalMenuItems || 0}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-extrabold text-lg mb-4">
                            Live Kitchen Queue ({incomingOrders.length})
                        </h3>
                        {incomingOrders.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No pending kitchen orders right now.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {incomingOrders.map((ord) => (
                                    <div
                                        key={ord._id}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-sm text-orange-500">
                                                    #{ord.orderNumber}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                                    {ord.status}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold mt-1">
                                                {(ord.items || [])
                                                    .map((i) => `${i.quantity}x ${i.name}`)
                                                    .join(", ")}
                                            </p>
                                            <span className="text-[11px] text-slate-400">
                                                Customer: {ord.user?.name} • Subtotal: ₹
                                                {ord.pricing?.subtotal}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {ord.status === "Order Placed" && (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            handleOrderStatusUpdate(
                                                                ord._id,
                                                                "Restaurant Accepted"
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Accept & Auto-Assign Rider
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            handleOrderStatusUpdate(
                                                                ord._id,
                                                                "Restaurant Rejected"
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                    </button>
                                                </>
                                            )}

                                            {["Restaurant Accepted", "Delivery Partner Assigned"].includes(
                                                ord.status
                                            ) && (
                                                    <button
                                                        onClick={() =>
                                                            handleOrderStatusUpdate(
                                                                ord._id,
                                                                "Food Preparing"
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <ChefHat className="w-3.5 h-3.5" />
                                                        Mark Food Preparing
                                                    </button>
                                                )}

                                            {["Food Preparing", "Restaurant Accepted", "Delivery Partner Assigned"].includes(
                                                ord.status
                                            ) && (
                                                    <button
                                                        onClick={() =>
                                                            handleOrderStatusUpdate(
                                                                ord._id,
                                                                "Ready for Pickup"
                                                            )
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <PackageCheck className="w-3.5 h-3.5" />
                                                        Mark Ready for Pickup
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 2: Incoming Orders */}
            {activeTab === "incoming" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h2 className="text-xl font-extrabold">
                        Incoming & Preparing Orders ({incomingOrders.length})
                    </h2>
                    {incomingOrders.length === 0 ? (
                        <p className="text-sm text-slate-500">All orders have been dispatched!</p>
                    ) : (
                        incomingOrders.map((ord) => (
                            <div
                                key={ord._id}
                                className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="space-y-1">
                                    <span className="font-extrabold text-sm text-orange-500">
                                        #{ord.orderNumber} • {ord.status}
                                    </span>
                                    <p className="text-sm font-bold">
                                        {(ord.items || [])
                                            .map((i) => `${i.quantity}x ${i.name}`)
                                            .join(", ")}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Assigned Rider:{" "}
                                        {ord.deliveryPartner?.user?.name || "Auto-assigning on Accept"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ord.status === "Order Placed" && (
                                        <button
                                            onClick={() =>
                                                handleOrderStatusUpdate(
                                                    ord._id,
                                                    "Restaurant Accepted"
                                                )
                                            }
                                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                        >
                                            Accept Order
                                        </button>
                                    )}
                                    {["Restaurant Accepted", "Delivery Partner Assigned"].includes(
                                        ord.status
                                    ) && (
                                            <button
                                                onClick={() =>
                                                    handleOrderStatusUpdate(ord._id, "Food Preparing")
                                                }
                                                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                                            >
                                                Start Preparing
                                            </button>
                                        )}
                                    {ord.status !== "Ready for Pickup" && (
                                        <button
                                            onClick={() =>
                                                handleOrderStatusUpdate(
                                                    ord._id,
                                                    "Ready for Pickup"
                                                )
                                            }
                                            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold cursor-pointer"
                                        >
                                            Ready for Pickup
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab 3: Menu Management */}
            {activeTab === "menu" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <form
                        onSubmit={handleAddFoodItem}
                        className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 h-fit"
                    >
                        <h3 className="font-extrabold text-lg flex items-center gap-2">
                            <Plus className="w-5 h-5 text-orange-500" />
                            <span>Add New Dish to Menu</span>
                        </h3>

                        <input
                            type="text"
                            required
                            value={newFood.name}
                            onChange={(e) => setNewFood((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Dish Name (e.g. Hyderabadi Mutton Biryani)"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                required
                                value={newFood.price}
                                onChange={(e) =>
                                    setNewFood((p) => ({ ...p, price: Number(e.target.value) }))
                                }
                                placeholder="Price (₹)"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                            <input
                                type="text"
                                value={newFood.categoryName}
                                onChange={(e) =>
                                    setNewFood((p) => ({ ...p, categoryName: e.target.value }))
                                }
                                placeholder="Category (e.g. Biryanis)"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <textarea
                            rows={2}
                            required
                            value={newFood.description}
                            onChange={(e) =>
                                setNewFood((p) => ({ ...p, description: e.target.value }))
                            }
                            placeholder="Detailed dish description..."
                            className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newFood.isVeg}
                                    onChange={(e) =>
                                        setNewFood((p) => ({ ...p, isVeg: e.target.checked }))
                                    }
                                    className="accent-emerald-600"
                                />
                                <span>Vegetarian Dish</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer"
                        >
                            Add Dish to Menu
                        </button>
                    </form>

                    <div className="lg:col-span-7 space-y-3">
                        {foods.map((f) => (
                            <div
                                key={f._id}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={f.image}
                                        alt={f.name}
                                        className="w-14 h-14 rounded-xl object-cover"
                                    />
                                    <div>
                                        <h4 className="font-bold text-sm">{f.name}</h4>
                                        <span className="text-xs text-slate-500">
                                            ₹{f.price} • {f.categoryName} • {f.orderCount || 0}{" "}
                                            orders
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleFoodAvailability(f)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${f.isAvailable
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-200 text-slate-600"
                                            }`}
                                    >
                                        {f.isAvailable ? "In Stock" : "Out of Stock"}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteFood(f._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 4: Order History */}
            {activeTab === "history" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">All Restaurant Orders ({orders.length})</h3>
                    {orders.map((o) => (
                        <div
                            key={o._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                            <div>
                                <span className="font-bold text-orange-500">#{o.orderNumber}</span>{" "}
                                • <strong>{o.status}</strong>
                                <p className="text-slate-500 mt-0.5">
                                    {(o.items || []).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="font-extrabold text-sm block">
                                    ₹{o.pricing?.subtotal}
                                </span>
                                <span className="text-slate-400">
                                    {new Date(o.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 5: Reviews */}
            {activeTab === "reviews" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="font-extrabold text-lg">Customer Reviews ({reviews.length})</h3>
                    {reviews.map((r) => (
                        <div
                            key={r._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1"
                        >
                            <div className="flex justify-between text-xs font-bold">
                                <span>{r.user?.name || "Verified Customer"}</span>
                                <span className="text-emerald-600">{r.restaurantRating} ★</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                {r.comment}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 6: Analytics */}
            {activeTab === "analytics" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="font-extrabold text-lg">Top Selling Dishes</h3>
                    <div className="space-y-3">
                        {[...foods]
                            .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
                            .map((f) => (
                                <div
                                    key={f._id}
                                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                                >
                                    <span className="font-bold">{f.name}</span>
                                    <span className="font-extrabold text-orange-500">
                                        {f.orderCount || 0} units sold • ₹
                                        {(f.orderCount || 0) * f.price}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Tab 7: Profile */}
            {activeTab === "profile" && (
                <form
                    onSubmit={handleSaveProfile}
                    className="max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
                >
                    <h3 className="font-extrabold text-lg">Edit Restaurant Information</h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Restaurant Name
                        </label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) =>
                                setProfileForm((p) => ({ ...p, name: e.target.value }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Cuisines (Comma separated)
                        </label>
                        <input
                            type="text"
                            value={profileForm.cuisines}
                            onChange={(e) =>
                                setProfileForm((p) => ({ ...p, cuisines: e.target.value }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Avg Price For Two (₹)
                            </label>
                            <input
                                type="number"
                                value={profileForm.avgPriceForTwo}
                                onChange={(e) =>
                                    setProfileForm((p) => ({
                                        ...p,
                                        avgPriceForTwo: Number(e.target.value),
                                    }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Promotional Offer Text
                            </label>
                            <input
                                type="text"
                                value={profileForm.offerText}
                                onChange={(e) =>
                                    setProfileForm((p) => ({ ...p, offerText: e.target.value }))
                                }
                                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer"
                    >
                        Save Restaurant Profile
                    </button>
                </form>
            )}
        </div>
    );
};

export default RestaurantDashboardPage;

