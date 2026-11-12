import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import api from "../services/api";
import RestaurantCard from "../components/RestaurantCard";

const WishlistPage = () => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/users/wishlist")
            .then((res) => setWishlist(res.data?.data?.wishlist || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold flex items-center gap-2">
                    <Heart className="w-7 h-7 text-red-500 fill-red-500" />
                    <span>Saved Wishlist Restaurants</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Quickly reorder from your favorite spots
                </p>
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
            ) : wishlist.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold">No restaurants in your wishlist yet</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Tap the heart icon on any restaurant card to save it here.
                    </p>
                    <Link
                        to="/restaurants"
                        className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold"
                    >
                        Browse Restaurants
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {wishlist.map((rest) => (
                        <RestaurantCard key={rest._id} restaurant={rest} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default WishlistPage;

