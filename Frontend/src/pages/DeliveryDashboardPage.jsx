import React, { useState, useEffect } from "react";
import {
    Truck,
    MapPin,
    DollarSign,
    Clock,
    CheckCircle2,
    XCircle,
    Navigation,
    User,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { getSocket, connectSocket } from "../services/socket";

const PRESET_LOCATIONS = [
    { label: "Indiranagar 100ft Rd", lat: 12.9784, lng: 77.6408 },
    { label: "Koramangala 5th Block", lat: 12.9352, lng: 77.6245 },
    { label: "MG Road / Brigade Rd", lat: 12.9746, lng: 77.6069 },
    { label: "HSR Layout Sector 1", lat: 12.9166, lng: 77.6481 },
];

const DeliveryDashboardPage = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [partner, setPartner] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPartnerData = async () => {
        try {
            const res = await api.get("/delivery/assignments");
            if (res.data?.data) {
                setPartner(res.data.data.partner);
                setAssignments(res.data.data.assignments || []);
            }
        } catch {
            toast.error("Failed to load delivery partner dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartnerData();
    }, []);

    useEffect(() => {
        if (!partner?._id) return;
        const socket = getSocket() || connectSocket();
        socket.emit("delivery:join", partner._id);

        const handleNewAssignment = () => {
            toast.success("New delivery order assigned to you!");
            fetchPartnerData();
        };

        socket.on("delivery:new_assignment", handleNewAssignment);
        return () => {
            socket.off("delivery:new_assignment", handleNewAssignment);
        };
    }, [partner?._id]);

    const handleSetStatus = async (updates) => {
        try {
            const res = await api.post("/delivery/set-status", updates);
            setPartner(res.data?.data?.partner);
            toast.success("Rider status & GPS location updated");
        } catch {
            toast.error("Could not update status");
        }
    };

    const handleRespondAssignment = async (assignmentId, action) => {
        try {
            await api.post(`/delivery/assignments/${assignmentId}/respond`, {
                action,
                reason: "Rider unavailable for this route",
            });
            toast.success(
                action === "accept"
                    ? "Assignment accepted!"
                    : "Assignment rejected & auto-reassigned to next partner"
            );
            fetchPartnerData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to respond");
        }
    };

    const handleOrderDeliveryStatus = async (orderId, nextStatus) => {
        try {
            await api.patch(`/orders/update-status/${orderId}`, {
                status: nextStatus,
            });
            toast.success(`Delivery status updated to '${nextStatus}'`);
            fetchPartnerData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not update order status");
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    const activeAssignments = assignments.filter(
        (a) =>
            a.order &&
            !["Delivered", "Cancelled", "Restaurant Rejected"].includes(a.order.status) &&
            !["rejected", "delivered"].includes(a.status)
    );
    const completedAssignments = assignments.filter(
        (a) => a.status === "delivered" || a.order?.status === "Delivered"
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                        Smart Geospatial Rider Portal (Task 4)
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                        {partner?.user?.name || "Delivery Partner"}
                    </h1>
                    <p className="text-xs text-slate-300 mt-1">
                        {partner?.vehicleType} ({partner?.vehicleNumber}) • GPS:{" "}
                        {partner?.currentLocation?.coordinates?.join(", ")} • {partner?.rating}★
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => handleSetStatus({ isOnline: !partner?.isOnline })}
                        className={`px-4 py-2.5 rounded-xl font-extrabold text-xs cursor-pointer ${partner?.isOnline
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                    >
                        {partner?.isOnline ? "● ONLINE & GPS Active" : "● OFFLINE"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                    { id: "overview", label: "Overview" },
                    { id: "assigned", label: `Assigned Deliveries (${activeAssignments.length})` },
                    { id: "availability", label: "Availability & GPS Location" },
                    { id: "history", label: "Delivery History" },
                    { id: "earnings", label: "Earnings & Payouts" },
                    { id: "profile", label: "Vehicle Profile" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${activeTab === t.id
                                ? "bg-orange-500 text-white"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Overview & Assigned Deliveries */}
            {(activeTab === "overview" || activeTab === "assigned") && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Today's Earnings
                            </span>
                            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                                ₹{partner?.earnings?.today || 0}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Active Deliveries
                            </span>
                            <p className="text-2xl font-extrabold text-orange-500 mt-1">
                                {activeAssignments.length}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Total Completed
                            </span>
                            <p className="text-2xl font-extrabold mt-1">
                                {partner?.totalDeliveriesCompleted || 0}
                            </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Lifetime Earnings
                            </span>
                            <p className="text-2xl font-extrabold mt-1">
                                ₹{partner?.earnings?.total || 0}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-extrabold text-lg">
                            Active Assigned Deliveries ({activeAssignments.length})
                        </h3>
                        {activeAssignments.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No active delivery assignments right now. Stay online to receive
                                automatic 2dsphere geospatial dispatches!
                            </p>
                        ) : (
                            activeAssignments.map((a) => (
                                <div
                                    key={a._id}
                                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-sm text-orange-500">
                                                Order #{a.order?.orderNumber}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                                {a.order?.status}
                                            </span>
                                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                Earning: ₹{a.partnerEarning}
                                            </span>
                                        </div>

                                        <p className="text-xs font-semibold">
                                            <strong>Pickup:</strong> {a.pickupLocation?.address} (
                                            {a.distanceToRestaurantKm} km away)
                                        </p>
                                        <p className="text-xs font-semibold">
                                            <strong>Dropoff:</strong> {a.dropLocation?.address} (
                                            {a.deliveryDistanceKm} km trip)
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => handleRespondAssignment(a._id, "reject")}
                                            className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-600 border border-red-300 text-xs font-bold cursor-pointer"
                                        >
                                            Reject & Reassign
                                        </button>

                                        {["Restaurant Accepted", "Food Preparing", "Ready for Pickup", "Delivery Partner Assigned"].includes(
                                            a.order?.status
                                        ) && (
                                                <button
                                                    onClick={() =>
                                                        handleOrderDeliveryStatus(
                                                            a.order._id,
                                                            "Picked Up"
                                                        )
                                                    }
                                                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                                                >
                                                    1. Mark Picked Up
                                                </button>
                                            )}

                                        {a.order?.status === "Picked Up" && (
                                            <button
                                                onClick={() =>
                                                    handleOrderDeliveryStatus(
                                                        a.order._id,
                                                        "Out for Delivery"
                                                    )
                                                }
                                                className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold cursor-pointer"
                                            >
                                                2. Mark Out for Delivery
                                            </button>
                                        )}

                                        {["Picked Up", "Out for Delivery"].includes(
                                            a.order?.status
                                        ) && (
                                                <button
                                                    onClick={() =>
                                                        handleOrderDeliveryStatus(
                                                            a.order._id,
                                                            "Delivered"
                                                        )
                                                    }
                                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                                >
                                                    3. Confirm Delivered ✓
                                                </button>
                                            )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Availability & Geo Location Manager */}
            {activeTab === "availability" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-orange-500" />
                        <span>Update Live 2dsphere Geospatial Coordinates (Task 4)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                        Select a Bengaluru zone below to update your `DeliveryPartner.currentLocation`
                        GeoJSON Point in MongoDB for `$near` proximity matching:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {PRESET_LOCATIONS.map((loc) => (
                            <button
                                key={loc.label}
                                onClick={() =>
                                    handleSetStatus({
                                        isOnline: true,
                                        isAvailable: true,
                                        lat: loc.lat,
                                        lng: loc.lng,
                                        zone: loc.label,
                                    })
                                }
                                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 text-left cursor-pointer"
                            >
                                <span className="font-bold text-xs block">{loc.label}</span>
                                <span className="text-[11px] text-slate-400">
                                    [{loc.lng}, {loc.lat}]
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            {activeTab === "history" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h3 className="font-extrabold text-lg">
                        Completed Deliveries ({completedAssignments.length})
                    </h3>
                    {completedAssignments.map((a) => (
                        <div
                            key={a._id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                            <div>
                                <span className="font-bold text-orange-500">
                                    #{a.order?.orderNumber}
                                </span>{" "}
                                • {a.pickupLocation?.address} → {a.dropLocation?.address}
                            </div>
                            <span className="font-extrabold text-emerald-600">
                                +₹{a.partnerEarning}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Earnings */}
            {activeTab === "earnings" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-xs text-slate-400 font-bold uppercase">Today</span>
                        <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                            ₹{partner?.earnings?.today || 0}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-xs text-slate-400 font-bold uppercase">
                            This Week
                        </span>
                        <p className="text-2xl font-extrabold mt-1">
                            ₹{partner?.earnings?.thisWeek || 0}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-xs text-slate-400 font-bold uppercase">
                            Pending Payout
                        </span>
                        <p className="text-2xl font-extrabold text-orange-500 mt-1">
                            ₹{partner?.earnings?.pendingPayout || 0}
                        </p>
                    </div>
                </div>
            )}

            {/* Profile */}
            {activeTab === "profile" && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 max-w-xl space-y-3 text-sm">
                    <h3 className="font-extrabold text-lg">Rider & Vehicle Details</h3>
                    <p>
                        <strong>Name:</strong> {partner?.user?.name}
                    </p>
                    <p>
                        <strong>Vehicle Type:</strong> {partner?.vehicleType}
                    </p>
                    <p>
                        <strong>Registration Number:</strong> {partner?.vehicleNumber}
                    </p>
                    <p>
                        <strong>License Number:</strong> {partner?.licenseNumber}
                    </p>
                    <p>
                        <strong>Operating Zone:</strong> {partner?.zone}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DeliveryDashboardPage;

