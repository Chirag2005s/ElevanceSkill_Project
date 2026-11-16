import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    Star,
    Clock,
    MapPin,
    Leaf,
    Plus,
    Minus,
    ShoppingBag,
    MessageSquare,
    Sparkles,
    Search,
    Calendar,
    Users,
    UtensilsCrossed,
    CheckCircle2,
    Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { addToCart, updateItemQuantity } from "../store/cartSlice";

const DEFAULT_FALLBACK_MENU = [
    {
        _id: "fallback-dish-1",
        categoryName: "Signature Specials",
        name: "Chef's Special Royal Dum Biryani",
        description:
            "Aromatic long-grain basmati rice slow-cooked with saffron, caramelized onions, and house-ground royal spices. Served with raita and salan.",
        price: 329,
        discountPrice: 289,
        isVeg: false,
        isBestseller: true,
        isAvailable: true,
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
    },
    {
        _id: "fallback-dish-2",
        categoryName: "Signature Specials",
        name: "Paneer Butter Masala & Garlic Naan Combo",
        description:
            "Soft malai cottage cheese cubes simmered in rich tomato-cashew makhani gravy with two butter-brushed tandoori garlic naans.",
        price: 279,
        discountPrice: 249,
        isVeg: true,
        isBestseller: true,
        isAvailable: true,
        image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
    },
    {
        _id: "fallback-dish-3",
        categoryName: "Starters & Appetizers",
        name: "Crispy Peri-Peri Paneer Tikka",
        description:
            "Char-grilled cottage cheese cubes marinated in smoky yoghurt, bell peppers, and tangy peri-peri spice blend.",
        price: 239,
        isVeg: true,
        isBestseller: false,
        isAvailable: true,
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80",
    },
    {
        _id: "fallback-dish-4",
        categoryName: "Starters & Appetizers",
        name: "Guntur Fiery Chicken 65",
        description:
            "Crispy wok-tossed chicken bites tempered with curry leaves, roasted garlic, and fiery red chillies.",
        price: 269,
        isVeg: false,
        isBestseller: true,
        isAvailable: true,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80",
    },
    {
        _id: "fallback-dish-5",
        categoryName: "Desserts & Beverages",
        name: "Belgian Dark Chocolate Lava Cake",
        description:
            "Warm chocolate sponge cake with a molten Belgian dark chocolate center, served with vanilla bean gelato.",
        price: 169,
        isVeg: true,
        isBestseller: true,
        isAvailable: true,
        image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=600&auto=format&fit=crop&q=80",
    },
];

const TIME_SLOTS = [
    "12:30 PM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "07:00 PM",
    "07:30 PM",
    "08:00 PM",
    "08:30 PM",
    "09:00 PM",
    "09:30 PM",
];

const SEATING_OPTIONS = [
    "Indoor AC Dining",
    "Rooftop / Outdoor",
    "Window Side Table",
    "Family Private Booth",
];

const RestaurantDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const bookingSectionRef = useRef(null);
    const menuSectionRef = useRef(null);

    const { items: cartItems } = useSelector((state) => state.cart);
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const [restaurant, setRestaurant] = useState(null);
    const [foods, setFoods] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeSectionTab, setActiveSectionTab] = useState("all"); // "all" | "book" | "menu"
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");

    // Table Booking State
    const todayStr = new Date().toISOString().split("T")[0];
    const [bookingDate, setBookingDate] = useState(todayStr);
    const [bookingTime, setBookingTime] = useState("08:00 PM");
    const [bookingGuests, setBookingGuests] = useState(2);
    const [seatingType, setSeatingType] = useState("Indoor AC Dining");
    const [guestName, setGuestName] = useState(user?.name || "");
    const [guestPhone, setGuestPhone] = useState(user?.phone || "");
    const [specialRequest, setSpecialRequest] = useState("");
    const [confirmedBookings, setConfirmedBookings] = useState([]);

    // Review form state
    const [ratingInput, setRatingInput] = useState(5);
    const [commentInput, setCommentInput] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        if (user?.name && !guestName) setGuestName(user.name);
        if (user?.phone && !guestPhone) setGuestPhone(user.phone);
    }, [user]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(`zingbite_bookings_${id}`) || "[]");
            setConfirmedBookings(Array.isArray(saved) ? saved : []);
        } catch {
            setConfirmedBookings([]);
        }
    }, [id]);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/restaurants/${id}`);
                if (res.data?.data) {
                    setRestaurant(res.data.data.restaurant);
                    const fetchedFoods = res.data.data.foods || [];
                    setFoods(fetchedFoods.length > 0 ? fetchedFoods : DEFAULT_FALLBACK_MENU);
                    setReviews(res.data.data.reviews || []);
                }
            } catch {
                toast.error("Could not load restaurant details");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleBookTableSubmit = (e) => {
        e.preventDefault();
        const finalName = (guestName || user?.name || "").trim();
        const finalPhone = (guestPhone || user?.phone || "").trim();

        if (!finalName || !finalPhone) {
            toast.error("Please enter your name and phone number to book a table");
            return;
        }

        const newBooking = {
            bookingId: `ZB-TBL-${Math.floor(100000 + Math.random() * 900000)}`,
            restaurantId: restaurant._id,
            restaurantName: restaurant.name,
            date: bookingDate,
            time: bookingTime,
            guests: Number(bookingGuests),
            seatingType,
            guestName: finalName,
            guestPhone: finalPhone,
            specialRequest: specialRequest.trim(),
            status: "Confirmed",
            createdAt: new Date().toISOString(),
        };

        const updated = [newBooking, ...confirmedBookings];
        setConfirmedBookings(updated);
        try {
            localStorage.setItem(`zingbite_bookings_${id}`, JSON.stringify(updated));
        } catch {
            // ignore storage errors
        }
        setSpecialRequest("");
        toast.success(
            `Table booked for ${bookingGuests} guest(s) at ${bookingTime} (${newBooking.bookingId})!`
        );
    };

    const handleCancelBooking = (bookingId) => {
        const updated = confirmedBookings.filter((b) => b.bookingId !== bookingId);
        setConfirmedBookings(updated);
        try {
            localStorage.setItem(`zingbite_bookings_${id}`, JSON.stringify(updated));
        } catch {
            // ignore storage errors
        }
        toast.success("Table reservation cancelled");
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
                <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold">Restaurant Not Found</h2>
                <Link
                    to="/restaurants"
                    className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm"
                >
                    Back to Restaurants
                </Link>
            </div>
        );
    }

    const categories = ["All", ...new Set(foods.map((f) => f.categoryName || "Recommended"))];

    const filteredFoods = foods.filter((food) => {
        if (selectedCategory !== "All" && food.categoryName !== selectedCategory) return false;
        if (vegOnlyFilter && !food.isVeg) return false;
        if (
            menuSearch.trim() &&
            !food.name.toLowerCase().includes(menuSearch.toLowerCase()) &&
            !food.description.toLowerCase().includes(menuSearch.toLowerCase())
        ) {
            return false;
        }
        return true;
    });

    const getItemQty = (foodId) => {
        const found = cartItems.find((i) => i.food._id === foodId);
        return found ? found.quantity : 0;
    };

    const handleAddFood = (food) => {
        dispatch(addToCart({ food, restaurant, quantity: 1 }));
        toast.success(`${food.name} added to cart`);
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error("Please log in to submit a review");
            return;
        }
        if (!commentInput.trim()) {
            toast.error("Please write a review comment");
            return;
        }

        setSubmittingReview(true);
        try {
            const res = await api.post(`/restaurants/${restaurant._id}/reviews`, {
                restaurantRating: ratingInput,
                foodRating: ratingInput,
                deliveryRating: 5,
                comment: commentInput.trim(),
            });
            if (res.data?.data?.review) {
                setReviews((prev) => [res.data.data.review, ...prev]);
                setRestaurant((prev) => ({
                    ...prev,
                    rating: res.data.data.updatedRating || prev.rating,
                    totalRatings: (prev.totalRatings || 0) + 1,
                }));
                setCommentInput("");
                toast.success("Review submitted!");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to post review");
        } finally {
            setSubmittingReview(false);
        }
    };

    const totalCartItems = cartItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28">
            {/* Restaurant Hero Card */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl mb-8">
                <img
                    src={restaurant.bannerImage}
                    alt={restaurant.name}
                    className="w-full h-64 sm:h-72 object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            {restaurant.isVegOnly && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                                    <Leaf className="w-3.5 h-3.5 fill-white" /> Pure Veg
                                </span>
                            )}
                            <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-extrabold">
                                {restaurant.offerText || "Free Delivery Available"}
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-extrabold">{restaurant.name}</h1>
                        <p className="text-sm text-slate-300 max-w-2xl">{restaurant.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300 pt-1">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-orange-400" />
                                {restaurant.address?.street}, {restaurant.address?.area}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-orange-400" />
                                {restaurant.deliveryTimeMinutes} mins delivery
                            </span>
                            <span>•</span>
                            <span>₹{restaurant.avgPriceForTwo} for two</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-3 shrink-0">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
                            <div className="flex items-center justify-center gap-1 text-emerald-400 font-extrabold text-2xl">
                                <Star className="w-6 h-6 fill-emerald-400" />
                                <span>{Number(restaurant.rating || 4.5).toFixed(1)}</span>
                            </div>
                            <span className="text-[11px] text-slate-300 block mt-0.5">
                                {restaurant.totalRatings || 100}+ Verified Ratings
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveSectionTab("book");
                                    bookingSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Book a Table</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveSectionTab("menu");
                                    menuSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <UtensilsCrossed className="w-3.5 h-3.5" />
                                <span>View Menu</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mode Switcher Tabs: All | Menu | Book a Table */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("all")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${activeSectionTab === "all"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                    >
                        Menu & Book Table
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("menu")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${activeSectionTab === "menu"
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                    >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Order Menu ({foods.length} Dishes)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSectionTab("book")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer ${activeSectionTab === "book"
                                ? "bg-orange-500 text-white shadow-sm"
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book a Table (Dine-In)</span>
                    </button>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Flat 20% OFF on Table Reservations</span>
                </span>
            </div>

            {/* Book a Table (Dineout Reservation) Section */}
            {(activeSectionTab === "all" || activeSectionTab === "book") && (
                <div
                    ref={bookingSectionRef}
                    className="mb-10 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-orange-200/80 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-orange-500" />
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                                    Book a Table at {restaurant.name}
                                </h2>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Instant table confirmation • Free cancellation • Complimentary welcome drink
                            </p>
                        </div>
                        <span className="self-start sm:self-auto px-3 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-extrabold">
                            Open: {restaurant.openingTime || "09:00"} - {restaurant.closingTime || "23:30"}
                        </span>
                    </div>

                    <form onSubmit={handleBookTableSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    min={todayStr}
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Number of Guests
                                </label>
                                <div className="relative">
                                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <select
                                        value={bookingGuests}
                                        onChange={(e) => setBookingGuests(Number(e.target.value))}
                                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                                            <option key={num} value={num}>
                                                {num} {num === 1 ? "Guest" : "Guests"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Seating Preference
                                </label>
                                <select
                                    value={seatingType}
                                    onChange={(e) => setSeatingType(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {SEATING_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                    Special Occasion / Note
                                </label>
                                <input
                                    type="text"
                                    value={specialRequest}
                                    onChange={(e) => setSpecialRequest(e.target.value)}
                                    placeholder="e.g. Birthday, High chair..."
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* Time Slot Pills */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                                Available Time Slots
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TIME_SLOTS.map((slot) => (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setBookingTime(slot)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${bookingTime === slot
                                                ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400"
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Guest Contact & Confirm Button */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <input
                                type="text"
                                required
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder="Your Full Name"
                                className="px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <input
                                type="tel"
                                required
                                value={guestPhone}
                                onChange={(e) => setGuestPhone(e.target.value)}
                                placeholder="Phone Number (10 digits)"
                                className="px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                type="submit"
                                className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 cursor-pointer transition-colors"
                            >
                                Confirm Table Booking →
                            </button>
                        </div>
                    </form>

                    {/* Confirmed Table Reservations List */}
                    {confirmedBookings.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-orange-200/60 dark:border-slate-800 space-y-2.5">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Your Confirmed Table Reservations ({confirmedBookings.length})</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {confirmedBookings.map((bk) => (
                                    <div
                                        key={bk.bookingId}
                                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
                                                    {bk.bookingId}
                                                </span>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                    {bk.date} at {bk.time}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                {bk.guests} Guest(s) • {bk.seatingType} • {bk.guestName}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleCancelBooking(bk.bookingId)}
                                            className="text-xs font-bold text-red-500 hover:underline cursor-pointer shrink-0"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Menu Section */}
            {(activeSectionTab === "all" || activeSectionTab === "menu") && (
                <div ref={menuSectionRef}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                Full Menu & Online Ordering
                            </h2>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                            {filteredFoods.length} items available
                        </span>
                    </div>

                    {/* Menu Filter Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === cat
                                            ? "bg-orange-500 text-white"
                                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 sm:w-56">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={menuSearch}
                                    onChange={(e) => setMenuSearch(e.target.value)}
                                    placeholder="Search in menu..."
                                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <button
                                onClick={() => setVegOnlyFilter((v) => !v)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${vegOnlyFilter
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                    }`}
                            >
                                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Veg Only</span>
                            </button>
                        </div>
                    </div>

                    {/* Menu Items List */}
                    <div className="space-y-4">
                        {filteredFoods.map((food) => {
                            const qty = getItemQty(food._id);
                            return (
                                <div
                                    key={food._id}
                                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-orange-300 dark:hover:border-orange-900 transition-colors"
                                >
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-4 h-4 rounded-xs border flex items-center justify-center ${food.isVeg ? "border-emerald-600" : "border-red-600"
                                                    }`}
                                            >
                                                <span
                                                    className={`w-2 h-2 rounded-full ${food.isVeg ? "bg-emerald-600" : "bg-red-600"
                                                        }`}
                                                />
                                            </span>
                                            {food.isBestseller && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Bestseller
                                                </span>
                                            )}
                                            <span className="text-[11px] font-semibold text-slate-400">
                                                {food.categoryName}
                                            </span>
                                        </div>

                                        <Link
                                            to={`/foods/${food._id}`}
                                            className="text-lg font-bold text-slate-900 dark:text-white hover:text-orange-500 transition-colors block"
                                        >
                                            {food.name}
                                        </Link>

                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-base text-slate-900 dark:text-white">
                                                ₹{food.discountPrice || food.price}
                                            </span>
                                            {food.discountPrice && (
                                                <span className="text-xs text-slate-400 line-through">
                                                    ₹{food.price}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                            {food.description}
                                        </p>
                                    </div>

                                    <div className="relative w-full sm:w-36 flex sm:flex-col items-center justify-between sm:justify-center gap-3 shrink-0">
                                        <Link
                                            to={`/foods/${food._id}`}
                                            className="w-28 h-24 sm:w-36 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 block"
                                        >
                                            <img
                                                src={food.image}
                                                alt={food.name}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                            />
                                        </Link>

                                        {qty === 0 ? (
                                            <button
                                                onClick={() => handleAddFood(food)}
                                                disabled={!food.isAvailable}
                                                className="px-6 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold text-xs uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                                            >
                                                {food.isAvailable ? "ADD +" : "Sold Out"}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm">
                                                <button
                                                    onClick={() =>
                                                        dispatch(
                                                            updateItemQuantity({
                                                                foodId: food._id,
                                                                quantity: qty - 1,
                                                            })
                                                        )
                                                    }
                                                    className="cursor-pointer"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span>{qty}</span>
                                                <button
                                                    onClick={() =>
                                                        dispatch(
                                                            updateItemQuantity({
                                                                foodId: food._id,
                                                                quantity: qty + 1,
                                                            })
                                                        )
                                                    }
                                                    className="cursor-pointer"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Customer Reviews & Ratings Section */}
            <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-extrabold flex items-center gap-2 mb-6">
                    <MessageSquare className="w-6 h-6 text-orange-500" />
                    <span>Customer Reviews ({reviews.length})</span>
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5">
                        <form
                            onSubmit={handleReviewSubmit}
                            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
                        >
                            <h3 className="font-bold text-base">Rate Your Experience</h3>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                    Rating (1 to 5 Stars)
                                </label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRatingInput(star)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer ${ratingInput >= star
                                                ? "bg-amber-50 border-amber-400 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
                                                : "border-slate-200 dark:border-slate-700 text-slate-400"
                                                }`}
                                        >
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            {star}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                    Your Feedback
                                </label>
                                <textarea
                                    rows={3}
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    placeholder="Share how the food taste, portion size, and packaging were..."
                                    className="w-full p-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submittingReview}
                                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors cursor-pointer"
                            >
                                {submittingReview ? "Posting..." : "Submit Review"}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                        {reviews.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No reviews yet. Be the first to review {restaurant.name}!
                            </p>
                        ) : (
                            reviews.map((rev) => (
                                <div
                                    key={rev._id}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm">
                                            {rev.user?.name || "Verified Customer"}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-white" />
                                            {rev.restaurantRating}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                        {rev.comment}
                                    </p>
                                    <span className="text-[11px] text-slate-400 block mt-2">
                                        {new Date(rev.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Cart Bar */}
            {totalCartItems > 0 && (
                <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40">
                    <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="w-5 h-5" />
                            <span className="font-extrabold text-sm">
                                {totalCartItems} item{totalCartItems > 1 ? "s" : ""} added to cart
                            </span>
                        </div>
                        <button
                            onClick={() => navigate("/cart")}
                            className="px-5 py-2 rounded-xl bg-white text-emerald-700 font-extrabold text-xs uppercase tracking-wider cursor-pointer"
                        >
                            View Cart & Checkout →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantDetailsPage;

