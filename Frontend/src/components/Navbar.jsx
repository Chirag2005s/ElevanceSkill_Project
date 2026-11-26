import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    Search,
    ShoppingBag,
    User,
    Bell,
    Heart,
    MapPin,
    Sun,
    Moon,
    LogOut,
    LayoutDashboard,
    Package,
    Flame,
    CheckCheck,
    Menu,
    X,
    ChevronDown,
    Navigation,
    Check,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import { clearCredentials, updateUserState } from "../store/authSlice";
import {
    setNotifications,
    pushNotification,
    markAllReadLocal,
    toggleTheme,
} from "../store/store";

const POPULAR_LOCATIONS = [
    {
        label: "Indiranagar",
        street: "100 Feet Road, Indiranagar, Bengaluru",
        pincode: "560038",
        lat: 12.9784,
        lng: 77.6408,
    },
    {
        label: "Koramangala",
        street: "5th Block, Koramangala, Bengaluru",
        pincode: "560095",
        lat: 12.9352,
        lng: 77.6245,
    },
    {
        label: "HSR Layout",
        street: "27th Main Road, Sector 1, HSR Layout",
        pincode: "560102",
        lat: 12.9166,
        lng: 77.6481,
    },
    {
        label: "MG Road",
        street: "Church Street, MG Road, Bengaluru",
        pincode: "560001",
        lat: 12.9746,
        lng: 77.6069,
    },
    {
        label: "Basavanagudi",
        street: "Gandhi Bazaar Main Road, Basavanagudi",
        pincode: "560004",
        lat: 12.9448,
        lng: 77.5713,
    },
    {
        label: "Whitefield",
        street: "ITPL Main Road, Whitefield, Bengaluru",
        pincode: "560066",
        lat: 12.9698,
        lng: 77.7499,
    },
    {
        label: "Jayanagar",
        street: "4th Block, Jayanagar, Bengaluru",
        pincode: "560011",
        lat: 12.925,
        lng: 77.5938,
    },
    {
        label: "BTM Layout",
        street: "2nd Stage, BTM Layout, Bengaluru",
        pincode: "560076",
        lat: 12.9166,
        lng: 77.6101,
    },
];

const Navbar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { user, isAuthenticated, restaurant, deliveryPartner } = useSelector(
        (state) => state.auth
    );
    const { items: cartItems } = useSelector((state) => state.cart);
    const { items: notifications, unreadCount } = useSelector(
        (state) => state.notifications
    );
    const { mode: themeMode } = useSelector((state) => state.theme);

    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [detectingGps, setDetectingGps] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(() => {
        try {
            const saved = localStorage.getItem("zingbite_selected_location");
            if (saved) return JSON.parse(saved);
        } catch {
            // ignore
        }
        return null;
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const notifRef = useRef(null);
    const locationRef = useRef(null);

    const activeLocationLabel =
        selectedLocation?.label || user?.savedAddresses?.[0]?.label || "Indiranagar";
    const activeLocationStreet =
        selectedLocation?.street ||
        user?.savedAddresses?.[0]?.street ||
        "100 Feet Road, Bengaluru";

    const applyLocationSelection = (locObj) => {
        setSelectedLocation(locObj);
        try {
            localStorage.setItem("zingbite_selected_location", JSON.stringify(locObj));
        } catch {
            // ignore
        }
        if (isAuthenticated && user) {
            const existingAddresses = user.savedAddresses || [];
            const updatedAddresses = [
                {
                    label: locObj.label || "Home",
                    street: locObj.street || `${locObj.label}, Bengaluru`,
                    city: "Bengaluru",
                    state: "Karnataka",
                    pincode: locObj.pincode || "560001",
                    isDefault: true,
                },
                ...existingAddresses.filter((a) => a.street !== locObj.street),
            ];
            dispatch(updateUserState({ savedAddresses: updatedAddresses }));
        }
        setShowLocationDropdown(false);
        setLocationSearch("");
        toast.success(`Delivery location set to ${locObj.label}`);
    };

    const handleCustomLocationSubmit = (e) => {
        e.preventDefault();
        const trimmed = locationSearch.trim();
        if (!trimmed) return;
        const parts = trimmed.split(",");
        const label = parts[0].trim();
        const street = parts.length > 1 ? trimmed : `${trimmed}, Bengaluru, Karnataka`;
        applyLocationSelection({
            label,
            street,
            pincode: "560001",
        });
    };

    const handleDetectCurrentGps = () => {
        setDetectingGps(true);
        if (!navigator.geolocation) {
            setDetectingGps(false);
            applyLocationSelection(POPULAR_LOCATIONS[0]);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                // Find closest Bengaluru hub or show GPS coordinates
                let closest = POPULAR_LOCATIONS[0];
                let minDist = Infinity;
                for (const loc of POPULAR_LOCATIONS) {
                    const d = Math.hypot(loc.lat - latitude, loc.lng - longitude);
                    if (d < minDist) {
                        minDist = d;
                        closest = loc;
                    }
                }
                setDetectingGps(false);
                applyLocationSelection({
                    label: `${closest.label} (GPS)`,
                    street: `${closest.street} (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
                    pincode: closest.pincode,
                    lat: latitude,
                    lng: longitude,
                });
            },
            () => {
                setDetectingGps(false);
                applyLocationSelection({
                    label: "Indiranagar (Live GPS)",
                    street: "100 Feet Road, Indiranagar, Bengaluru",
                    pincode: "560038",
                });
            },
            { timeout: 6000 }
        );
    };

    const totalCartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Fetch notifications and initialize Socket.IO real-time listener (Task 5)
    useEffect(() => {
        if (!isAuthenticated || !user?._id) return;

        api.get("/notifications")
            .then((res) => {
                if (res.data?.data) {
                    dispatch(setNotifications(res.data.data));
                }
            })
            .catch(() => { });

        const socket = connectSocket(user, { restaurant, deliveryPartner });

        const handleNewNotification = (payload) => {
            dispatch(pushNotification(payload));
            if (payload?.notification?.title) {
                toast.success(`${payload.notification.title}: ${payload.notification.message}`, {
                    duration: 4500,
                });
            }
        };

        const handleFraudAlert = (alert) => {
            if (user?.role === "admin") {
                toast.error(
                    `FRAUD ALERT: Order #${alert.orderNumber} flagged (${alert.riskLevel} Risk: ${alert.riskScore})`,
                    { duration: 6000 }
                );
            }
        };

        socket.on("notification:new", handleNewNotification);
        socket.on("admin:fraud_alert", handleFraudAlert);

        return () => {
            socket.off("notification:new", handleNewNotification);
            socket.off("admin:fraud_alert", handleFraudAlert);
        };
    }, [isAuthenticated, user?._id, user?.role, restaurant, deliveryPartner, dispatch]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifDropdown(false);
            }
            if (locationRef.current && !locationRef.current.contains(e.target)) {
                setShowLocationDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            dispatch(markAllReadLocal());
        } catch {
            dispatch(markAllReadLocal());
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // ignore
        }
        disconnectSocket();
        dispatch(clearCredentials());
        toast.success("Logged out successfully");
        navigate("/login");
    };

    const getDashboardLink = () => {
        if (!user) return null;
        if (user.role === "admin")
            return { to: "/admin", label: "Admin" };
        if (user.role === "restaurant")
            return { to: "/restaurant-dashboard", label: "Restaurant Hub" };
        if (user.role === "delivery")
            return { to: "/delivery-dashboard", label: "Rider Portal" };
        return null;
    };

    const dashboardInfo = getDashboardLink();

    return (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
                {/* Brand Logo & Location Selector */}
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
                            <Flame className="w-6 h-6 fill-white" />
                        </div>
                        <div>
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                Zing<span className="text-orange-500">Bite</span>
                            </span>
                            {/* <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 -mt-1">
                                Express Delivery
                            </span> */}
                        </div>
                    </Link>

                    {/* Interactive Location Selector */}
                    <div className="relative" ref={locationRef}>
                        <button
                            type="button"
                            onClick={() => setShowLocationDropdown((prev) => !prev)}
                            className="flex items-center gap-2 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-800 text-sm hover:text-orange-500 transition-colors cursor-pointer text-left"
                        >
                            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                            <div className="truncate max-w-[140px] sm:max-w-[220px]">
                                <span className="font-bold text-slate-800 dark:text-slate-100 border-b-2 border-orange-500 pb-0.5">
                                    {activeLocationLabel}
                                </span>
                                <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-xs ml-1.5">
                                    {activeLocationStreet}
                                </span>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 text-orange-500 shrink-0 transition-transform ${showLocationDropdown ? "rotate-180" : ""
                                    }`}
                            />
                        </button>

                        {showLocationDropdown && (
                            <div className="absolute left-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                            Select Delivery Location
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Choose your area for accurate delivery time & fees
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowLocationDropdown(false)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Detect Current GPS Button */}
                                <button
                                    type="button"
                                    onClick={handleDetectCurrentGps}
                                    disabled={detectingGps}
                                    className="w-full p-3 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60 text-orange-600 dark:text-orange-400 hover:bg-orange-100 transition-colors flex items-center gap-2.5 text-xs font-extrabold cursor-pointer"
                                >
                                    <Navigation
                                        className={`w-4 h-4 shrink-0 ${detectingGps ? "animate-spin" : ""
                                            }`}
                                    />
                                    <span>
                                        {detectingGps
                                            ? "Detecting your GPS location..."
                                            : "Use My Current GPS Location"}
                                    </span>
                                </button>

                                {/* Custom Area / Street Input */}
                                <form onSubmit={handleCustomLocationSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        placeholder="Enter area, street or pincode..."
                                        className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer shrink-0"
                                    >
                                        Set
                                    </button>
                                </form>

                                {/* Saved User Addresses */}
                                {isAuthenticated &&
                                    Array.isArray(user?.savedAddresses) &&
                                    user.savedAddresses.length > 0 && (
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                                Saved Addresses
                                            </span>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                {user.savedAddresses.map((addr, idx) => {
                                                    const isSelected =
                                                        activeLocationStreet === addr.street;
                                                    return (
                                                        <button
                                                            key={addr._id || idx}
                                                            type="button"
                                                            onClick={() =>
                                                                applyLocationSelection({
                                                                    label: addr.label || "Saved",
                                                                    street: addr.street,
                                                                    pincode: addr.pincode,
                                                                })
                                                            }
                                                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${isSelected
                                                                ? "bg-orange-50/70 border-orange-400 dark:bg-orange-950/30"
                                                                : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                                }`}
                                                        >
                                                            <div className="truncate">
                                                                <span className="text-xs font-bold block text-slate-800 dark:text-slate-100">
                                                                    {addr.label}
                                                                </span>
                                                                <span className="text-[11px] text-slate-500 truncate block">
                                                                    {addr.street}
                                                                </span>
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="w-4 h-4 text-orange-500 shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                {/* Popular Bengaluru Hubs */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                        Popular Delivery Hubs in Bengaluru
                                    </span>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                                        {POPULAR_LOCATIONS.filter(
                                            (loc) =>
                                                !locationSearch.trim() ||
                                                loc.label
                                                    .toLowerCase()
                                                    .includes(locationSearch.toLowerCase()) ||
                                                loc.street
                                                    .toLowerCase()
                                                    .includes(locationSearch.toLowerCase())
                                        ).map((loc) => {
                                            const isSelected = activeLocationLabel === loc.label;
                                            return (
                                                <button
                                                    key={loc.label}
                                                    type="button"
                                                    onClick={() => applyLocationSelection(loc)}
                                                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                                                        ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                                                        : "bg-slate-50 dark:bg-slate-800/70 border-slate-200/70 dark:border-slate-700 hover:border-orange-400 text-slate-700 dark:text-slate-200"
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold truncate">
                                                        {loc.label}
                                                    </div>
                                                    <div
                                                        className={`text-[10px] truncate ${isSelected
                                                            ? "text-orange-100"
                                                            : "text-slate-400"
                                                            }`}
                                                    >
                                                        {loc.pincode}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {/* <Link
                        to="/search"
                        className={`flex items-center gap-2 hover:text-orange-500 transition-colors ${location.pathname === "/search" ? "text-orange-500" : ""
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        <span>Search</span>
                    </Link> */}

                    <Link
                        to="/restaurants"
                        className={`hover:text-orange-500 transition-colors ${location.pathname === "/restaurants" ? "text-orange-500" : ""
                            }`}
                    >
                        Restaurants
                    </Link>

                    <Link
                        to="/wishlist"
                        className={`flex items-center gap-1.5 hover:text-orange-500 transition-colors ${location.pathname === "/wishlist" ? "text-orange-500" : ""
                            }`}
                    >
                        <Heart className="w-4 h-4" />
                        <span>Wishlist</span>
                    </Link>

                    {isAuthenticated && (
                        <Link
                            to="/my-orders"
                            className={`flex items-center gap-1.5 hover:text-orange-500 transition-colors ${location.pathname === "/my-orders" ? "text-orange-500" : ""
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Orders</span>
                        </Link>
                    )}

                    {dashboardInfo && (
                        <Link
                            to={dashboardInfo.to}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>{dashboardInfo.label}</span>
                        </Link>
                    )}
                </nav>

                {/* Right Action Icons */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        onClick={() => dispatch(toggleTheme())}
                        title="Toggle Light / Dark Mode"
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                        {themeMode === "dark" ? (
                            <Sun className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Live Notifications Dropdown */}
                    {isAuthenticated && (
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setShowNotifDropdown((prev) => !prev)}
                                className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-500 transition-colors cursor-pointer"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifDropdown && (
                                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50">
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-sm">Live Notifications</h4>
                                            <p className="text-xs text-slate-500">
                                                Real-time Socket.IO updates
                                            </p>
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-500">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.slice(0, 12).map((n) => (
                                                <div
                                                    key={n._id}
                                                    onClick={() => {
                                                        setShowNotifDropdown(false);
                                                        if (n.order?._id || n.order) {
                                                            navigate(`/orders/${n.order._id || n.order}`);
                                                        }
                                                    }}
                                                    className={`p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!n.isRead
                                                        ? "bg-orange-50/40 dark:bg-orange-950/20"
                                                        : ""
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                                            {n.title}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(n.createdAt).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                                        {n.message}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cart Button */}
                    <Link
                        to="/cart"
                        className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-orange-500 text-white font-semibold text-sm hover:bg-orange-500 dark:hover:bg-orange-600 transition-colors shadow-xs"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline">Cart</span>
                        {totalCartQuantity > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-500 dark:bg-slate-950 text-white text-xs font-bold">
                                {totalCartQuantity}
                            </span>
                        )}
                    </Link>

                    {/* User Profile / Auth */}
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500 transition-colors"
                            >
                                <User className="w-4 h-4 text-orange-500" />
                                <span className="hidden sm:inline text-sm font-semibold truncate max-w-[100px]">
                                    {user?.name?.split(" ")[0]}
                                </span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                title="Logout"
                                className="p-2.5 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors shadow-sm shadow-orange-500/20"
                        >
                            Sign In
                        </Link>
                    )}

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen((p) => !p)}
                        className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2 text-sm font-semibold">
                    <Link
                        to="/search"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2 hover:text-orange-500"
                    >
                        Search Restaurants & Dishes
                    </Link>
                    <Link
                        to="/restaurants"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2 hover:text-orange-500"
                    >
                        All Restaurants
                    </Link>
                    <Link
                        to="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="py-2 hover:text-orange-500"
                    >
                        My Wishlist
                    </Link>
                    {isAuthenticated && (
                        <Link
                            to="/my-orders"
                            onClick={() => setMobileMenuOpen(false)}
                            className="py-2 hover:text-orange-500"
                        >
                            My Orders
                        </Link>
                    )}
                    {dashboardInfo && (
                        <Link
                            to={dashboardInfo.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className="py-2 text-orange-500 font-bold"
                        >
                            {dashboardInfo.label}
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
};

export default Navbar;

