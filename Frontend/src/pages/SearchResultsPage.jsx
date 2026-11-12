import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
    Search,
    Sparkles,
    Zap,
    SlidersHorizontal,
    Clock,
    Star,
    Leaf,
} from "lucide-react";
import api from "../services/api";
import RestaurantCard from "../components/RestaurantCard";

const TYPO_DEMOS = [
    { label: "birynai (Typo -> Biryani)", q: "birynai" },
    { label: "panner (Typo -> Paneer)", q: "panner" },
    { label: "masla dosa (Typo -> Dosa)", q: "masla dosa" },
    { label: "burgr (Typo -> Burger)", q: "burgr" },
    { label: "waffel (Typo -> Waffle)", q: "waffel" },
];

const SearchResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [cuisine, setCuisine] = useState(searchParams.get("cuisine") || "All");
    const [rating, setRating] = useState(searchParams.get("rating") || "");
    const [maxDeliveryTime, setMaxDeliveryTime] = useState(
        searchParams.get("maxDeliveryTime") || ""
    );
    const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
    const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
    const [vegetarian, setVegetarian] = useState(searchParams.get("vegetarian") === "true");
    const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "popularity");

    const [restaurants, setRestaurants] = useState([]);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const executeSearch = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (query.trim()) params.set("q", query.trim());
                if (cuisine && cuisine !== "All") params.set("cuisine", cuisine);
                if (rating) params.set("rating", rating);
                if (maxDeliveryTime) params.set("maxDeliveryTime", maxDeliveryTime);
                if (minPrice) params.set("minPrice", minPrice);
                if (maxPrice) params.set("maxPrice", maxPrice);
                if (vegetarian) params.set("vegetarian", "true");
                if (sortBy) params.set("sortBy", sortBy);

                setSearchParams(params, { replace: true });

                const res = await api.get(`/restaurants/search?${params.toString()}`);
                setRestaurants(res.data?.data?.restaurants || []);
                setMeta(res.data?.meta || null);
            } catch {
                setRestaurants([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(executeSearch, 200);
        return () => clearTimeout(debounce);
    }, [query, cuisine, rating, maxDeliveryTime, minPrice, maxPrice, vegetarian, sortBy]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Search Input Header */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            <Search className="w-6 h-6 text-orange-500" />
                            <span>Advanced Restaurant & Dish Search Engine</span>
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Powered by MongoDB Aggregation Pipelines, Fuse.js Fuzzy Typo Matching &
                            Redis Caching (Task 2)
                        </p>
                    </div>

                    {meta && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${meta.cached
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    }`}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                {meta.cached ? "Redis Cache HIT" : "MongoDB Pipeline"} ({meta.latencyMs || 4}ms)
                            </span>

                            {meta.fuzzyMatched && (
                                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Fuzzy Typo Correction Active
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Search Input Box */}
                <div className="relative">
                    <Search className="w-5 h-5 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by restaurant, dish, cuisine, or test spelling mistakes like 'birynai', 'panner', 'waffel'..."
                        className="w-full pl-12 pr-24 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Interactive Typo Tolerance Test Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Test Fuzzy Search:
                    </span>
                    {TYPO_DEMOS.map((demo) => (
                        <button
                            key={demo.q}
                            onClick={() => setQuery(demo.q)}
                            className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/50 text-xs font-semibold hover:bg-orange-100 transition-colors cursor-pointer"
                        >
                            {demo.label}
                        </button>
                    ))}
                </div>

                {/* Multi-Filter Controls */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Cuisine
                        </label>
                        <select
                            value={cuisine}
                            onChange={(e) => setCuisine(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="All">All Cuisines</option>
                            <option value="Biryani">Biryani</option>
                            <option value="North Indian">North Indian</option>
                            <option value="South Indian">South Indian</option>
                            <option value="Burgers">Burgers</option>
                            <option value="Italian">Italian</option>
                            <option value="Chinese">Chinese</option>
                            <option value="Desserts">Desserts</option>
                            <option value="Healthy Food">Healthy Food</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Min Rating
                        </label>
                        <select
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="">Any Rating</option>
                            <option value="4.0">4.0+ Stars</option>
                            <option value="4.5">4.5+ Stars</option>
                            <option value="4.7">4.7+ Stars</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Max Delivery Time
                        </label>
                        <select
                            value={maxDeliveryTime}
                            onChange={(e) => setMaxDeliveryTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="">Any Time</option>
                            <option value="25">Under 25 mins</option>
                            <option value="30">Under 30 mins</option>
                            <option value="40">Under 40 mins</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Max Price for Two
                        </label>
                        <select
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="">Any Price</option>
                            <option value="300">Under ₹300</option>
                            <option value="500">Under ₹500</option>
                            <option value="700">Under ₹700</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Dietary
                        </label>
                        <button
                            type="button"
                            onClick={() => setVegetarian((v) => !v)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${vegetarian
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                }`}
                        >
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{vegetarian ? "Veg Only Active" : "All Dietary"}</span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                            Sort Results
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <option value="popularity">Relevance & Popularity</option>
                            <option value="rating">Highest Rated</option>
                            <option value="deliveryTime">Fastest Delivery</option>
                            <option value="priceLowToHigh">Price: Low to High</option>
                            <option value="priceHighToLow">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Search Results */}
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                    {loading
                        ? "Searching..."
                        : `${restaurants.length} Restaurant${restaurants.length === 1 ? "" : "s"} Found`}
                </h2>
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
            ) : restaurants.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold">No matching restaurants found</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Try searching for "Biryani", "Dosa", "Burger", or "Pizza".
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {restaurants.map((rest) => (
                        <div key={rest._id} className="space-y-2">
                            <RestaurantCard restaurant={rest} />
                            {rest.menuPreview && rest.menuPreview.length > 0 && (
                                <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs">
                                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                                        Popular Dishes:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {rest.menuPreview.slice(0, 2).map((dish) => (
                                            <Link
                                                key={dish._id}
                                                to={`/foods/${dish._id}`}
                                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:text-orange-500 font-medium truncate max-w-[180px]"
                                            >
                                                {dish.name} (₹{dish.price})
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchResultsPage;

