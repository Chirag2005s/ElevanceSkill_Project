import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    Search,
    Sparkles,
    Flame,
    Clock,
    ShieldCheck,
    Zap,
    ArrowRight,
    Tag,
    Star,
} from "lucide-react";
import api from "../services/api";
import RestaurantCard from "../components/RestaurantCard";

const FOOD_CATEGORIES = [
    {
        name: "Biryani",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "South Indian",
        image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "Burgers",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "Pizza",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "North Indian",
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "Chinese",
        image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "Desserts",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300&auto=format&fit=crop&q=80",
    },
    {
        name: "Healthy Food",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop&q=80",
    },
];

const TASTE_PROFILE_PREVIOUS_IMAGES = {
    "Meghana Royal Biryani House":
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80",
    "Vidyarthi Heritage Tiffins":
        "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1000&auto=format&fit=crop&q=80",
    "Truffles Gourmet Burgers & Bistro":
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&auto=format&fit=crop&q=80",
    "Napoli Wood-Fired Pizzeria":
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80",
    "Mainland Wok & Dimsum Studio":
        "https://images.unsplash.com/photo-1552611052-33e04de081de?w=1000&auto=format&fit=crop&q=80",
    "Punjab Grill & Tandoor Dhaba":
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1000&auto=format&fit=crop&q=80",
    "Belgian Waffle & Gelato Factory":
        "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1000&auto=format&fit=crop&q=80",
    "GreenCraft Poke & Protein Bowls":
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&auto=format&fit=crop&q=80",
};

const TOP_RESTAURANT_CHAIN_IMAGES = {
    "Meghana Royal Biryani House":
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80",
    "Vidyarthi Heritage Tiffins":
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&auto=format&fit=crop&q=80",
    "Truffles Gourmet Burgers & Bistro":
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80",
    "Napoli Wood-Fired Pizzeria":
        "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=1000&auto=format&fit=crop&q=80",
    "Mainland Wok & Dimsum Studio":
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1000&auto=format&fit=crop&q=80",
    "Punjab Grill & Tandoor Dhaba":
        "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000&auto=format&fit=crop&q=80",
    "Belgian Waffle & Gelato Factory":
        "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=1000&auto=format&fit=crop&q=80",
    "GreenCraft Poke & Protein Bowls":
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1000&auto=format&fit=crop&q=80",
};

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [searchQuery, setSearchQuery] = useState("");
    const [recommendations, setRecommendations] = useState([]);
    const [isPersonalized, setIsPersonalized] = useState(false);
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            setLoading(true);
            try {
                const [recRes, restRes, couponRes] = await Promise.all([
                    api.get("/restaurants/recommendations?limit=4"),
                    api.get("/restaurants?limit=8&sortBy=popularity"),
                    api.get("/users/coupons"),
                ]);

                if (recRes.data?.data) {
                    const tasteProfileRecs = (recRes.data.data.recommendations || []).map(
                        (rec) => ({
                            ...rec,
                            bannerImage:
                                TASTE_PROFILE_PREVIOUS_IMAGES[rec.name] || rec.bannerImage,
                        })
                    );
                    setRecommendations(tasteProfileRecs);
                    setIsPersonalized(Boolean(recRes.data.data.isPersonalized));
                }
                if (restRes.data?.data) {
                    const topChainsWithImages = (restRes.data.data.restaurants || [])
                        .map((rest) => ({
                            ...rest,
                            bannerImage:
                                TOP_RESTAURANT_CHAIN_IMAGES[rest.name] || rest.bannerImage,
                        }))
                        .filter((rest) => Boolean((rest.bannerImage || "").trim()));
                    setRestaurants(topChainsWithImages);
                }
                if (couponRes.data?.data) {
                    setCoupons(couponRes.data.data.coupons || []);
                }
            } catch {
                // fallback handled cleanly
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, [user?._id]);

    const handleHeroSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate("/search");
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Banner Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 text-white py-14 sm:py-20">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
                            <Zap className="w-3.5 h-3.5 text-orange-400" />
                            <span>Lightning-Fast Delivery Across Bengaluru</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                            Craving something{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                                extraordinary?
                            </span>
                        </h1>

                        <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                            Order from top-rated local restaurants with live GPS rider tracking,
                            transparent surge pricing, and AI-powered recommendations tailored to
                            your taste.
                        </p>

                        {/* Search Bar */}
                        <form
                            onSubmit={handleHeroSearch}
                            className="flex flex-col sm:flex-row gap-3 max-w-xl pt-2"
                        >
                            <div className="relative flex-1">
                                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search 'Meghana Biryani', 'Benne Dosa', or try typo 'birynai'..."
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-lg"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-7 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/30 cursor-pointer shrink-0"
                            >
                                Find Food
                            </button>
                        </form>

                        {/* Feature Pills */}
                        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-orange-400" />
                                25 Min Avg Delivery
                            </span>
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Fraud-Protected Checkout
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Fuzzy Typo-Tolerant Search
                            </span>
                        </div>
                    </div>

                    <div className="lg:col-span-5 hidden lg:block">
                        <div className="relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&auto=format&fit=crop&q=80"
                                alt="Signature Dum Biryani"
                                className="w-full h-96 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold uppercase text-orange-400">
                                            Most Ordered Today
                                        </span>
                                        <h3 className="text-lg font-extrabold text-white">
                                            Meghana Royal Dum Biryani
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-white" /> 4.8
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
                {/* What's on your mind? Categories */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {user ? `${user.name.split(" ")[0]}, what's on your mind?` : "What's on your mind?"}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Explore curated cuisines from top kitchens
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                        {FOOD_CATEGORIES.map((cat) => (
                            <Link
                                key={cat.name}
                                to={`/search?cuisine=${encodeURIComponent(cat.name)}`}
                                className="group flex flex-col items-center text-center gap-2.5"
                            >
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-orange-500 shadow-md transition-all">
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-500 transition-colors">
                                    {cat.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Active Promo Coupons Strip */}
                {coupons.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Tag className="w-5 h-5 text-orange-500" />
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                Best Offers For You
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {coupons.slice(0, 4).map((coupon) => (
                                <div
                                    key={coupon._id}
                                    className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/60 dark:from-slate-900 dark:to-slate-800 border border-orange-200/70 dark:border-slate-700 flex items-center justify-between gap-3"
                                >
                                    <div>
                                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-orange-500 text-white text-xs font-extrabold tracking-wider">
                                            {coupon.code}
                                        </span>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">
                                            {coupon.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Min order ₹{coupon.minOrderAmount}
                                        </p>
                                    </div>
                                    <Link
                                        to="/restaurants"
                                        className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0"
                                    >
                                        Use Now →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* TASK 6: Dynamic Personalized Restaurant Recommendations */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-orange-500" />
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                    {isPersonalized
                                        ? "Recommended For Your Taste Profile"
                                        : "Trending Recommendations Near You"}
                                </h2>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Ranked dynamically by cuisine affinity, ratings, dietary preference &
                                order velocity
                            </p>
                        </div>
                        <Link
                            to="/restaurants"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600"
                        >
                            <span>Explore All</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((n) => (
                                <div
                                    key={n}
                                    className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {recommendations.map((rest) => (
                                <RestaurantCard
                                    key={rest._id}
                                    restaurant={rest}
                                    showRecommendationBadge={true}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Top Restaurants in Bengaluru */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                    Top Restaurant Chains in Bengaluru
                                </h2>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Curated kitchens delivering hot & fresh meals to your doorstep
                            </p>
                        </div>
                        <Link
                            to="/restaurants"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600"
                        >
                            <span>See All Restaurants</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div
                                    key={n}
                                    className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {restaurants.map((rest) => (
                                <RestaurantCard key={rest._id} restaurant={rest} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default HomePage;

