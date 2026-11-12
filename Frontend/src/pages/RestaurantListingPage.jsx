import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Star, Clock, Leaf, RotateCcw } from "lucide-react";
import api from "../services/api";
import RestaurantCard from "../components/RestaurantCard";

const CUISINES = [
    "All",
    "Biryani",
    "North Indian",
    "South Indian",
    "Burgers",
    "Italian",
    "Chinese",
    "Desserts",
    "Healthy Food",
];

const RestaurantListingPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        cuisine: "All",
        rating: "",
        maxDeliveryTime: "",
        vegetarian: false,
        sortBy: "popularity",
    });

    useEffect(() => {
        const fetchFilteredRestaurants = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.cuisine && filters.cuisine !== "All") {
                    params.set("cuisine", filters.cuisine);
                }
                if (filters.rating) params.set("rating", filters.rating);
                if (filters.maxDeliveryTime) params.set("maxDeliveryTime", filters.maxDeliveryTime);
                if (filters.vegetarian) params.set("vegetarian", "true");
                if (filters.sortBy) params.set("sortBy", filters.sortBy);

                const res = await api.get(`/restaurants/search?${params.toString()}`);
                setRestaurants(res.data?.data?.restaurants || []);
            } catch {
                setRestaurants([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFilteredRestaurants();
    }, [filters]);

    const resetFilters = () => {
        setFilters({
            cuisine: "All",
            rating: "",
            maxDeliveryTime: "",
            vegetarian: false,
            sortBy: "popularity",
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    Restaurants with Online Food Delivery in Bengaluru
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Filter by cuisine, ratings, delivery speed, and dietary preferences
                </p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-8 space-y-4">
                {/* Cuisine Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <SlidersHorizontal className="w-4 h-4 text-orange-500 shrink-0 mr-1" />
                    {CUISINES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setFilters((prev) => ({ ...prev, cuisine: c }))}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${filters.cuisine === c
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-orange-50"
                                }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                {/* Quick Filter Toggles & Sort */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    rating: prev.rating === "4.5" ? "" : "4.5",
                                }))
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${filters.rating === "4.5"
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                        >
                            <Star className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                            <span>Ratings 4.5+</span>
                        </button>

                        <button
                            onClick={() =>
                                setFilters((prev) => ({
                                    ...prev,
                                    maxDeliveryTime: prev.maxDeliveryTime === "25" ? "" : "25",
                                }))
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${filters.maxDeliveryTime === "25"
                                ? "bg-orange-50 border-orange-500 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                        >
                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                            <span>Fast Delivery (&le; 25 mins)</span>
                        </button>

                        <button
                            onClick={() =>
                                setFilters((prev) => ({ ...prev, vegetarian: !prev.vegetarian }))
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${filters.vegetarian
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                        >
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Veg Friendly</span>
                        </button>

                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-orange-500 cursor-pointer"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Sort by:</span>
                        <select
                            value={filters.sortBy}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                            }
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="popularity">Popularity</option>
                            <option value="rating">Rating: High to Low</option>
                            <option value="deliveryTime">Delivery Time: Fastest</option>
                            <option value="priceLowToHigh">Cost: Low to High</option>
                            <option value="priceHighToLow">Cost: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Restaurant Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div
                            key={n}
                            className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                        />
                    ))}
                </div>
            ) : restaurants.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold">No restaurants match your current filters</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Try clearing one or more filters to see more options.
                    </p>
                    <button
                        onClick={resetFilters}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold cursor-pointer"
                    >
                        Reset All Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {restaurants.map((rest) => (
                        <RestaurantCard key={rest._id} restaurant={rest} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RestaurantListingPage;

