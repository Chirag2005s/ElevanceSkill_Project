import React from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Star, Clock, Heart, Sparkles, Leaf, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { updateUserState } from "../store/authSlice";

const RestaurantCard = ({ restaurant, showRecommendationBadge = false }) => {
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    const isWishlisted = (user?.wishlist || []).some(
        (w) => (w._id || w).toString() === restaurant._id?.toString()
    );

    const handleWishlistToggle = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            toast.error("Please sign in to save restaurants to your wishlist");
            return;
        }

        try {
            const res = await api.post(`/users/wishlist/${restaurant._id}`);
            if (res.data?.data?.wishlist) {
                dispatch(updateUserState({ wishlist: res.data.data.wishlist }));
                toast.success(res.data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not update wishlist");
        }
    };

    return (
        <Link
            to={`/restaurants/${restaurant._id}`}
            className="group block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                    src={
                        restaurant.bannerImage ||
                        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                {/* Offer Text Overlay */}
                {restaurant.offerText && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-white font-extrabold text-base tracking-tight drop-shadow-sm">
                            {restaurant.offerText}
                        </span>
                    </div>
                )}

                {/* Pure Veg Badge */}
                {restaurant.isVegOnly && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600/95 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                        <Leaf className="w-3 h-3 fill-white" />
                        <span>PURE VEG</span>
                    </div>
                )}

                {/* Recommendation Match Score Badge (Task 6) */}
                {showRecommendationBadge && restaurant.matchPercentage && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-md">
                        <Sparkles className="w-3 h-3 fill-white" />
                        <span>{restaurant.matchPercentage}% Match</span>
                    </div>
                )}

                {/* Wishlist Heart Button */}
                <button
                    onClick={handleWishlistToggle}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                >
                    <Heart
                        className={`w-4 h-4 ${isWishlisted
                            ? "fill-red-500 text-red-500"
                            : "text-slate-600 dark:text-slate-300"
                            }`}
                    />
                </button>
            </div>

            {/* Card Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
                        {restaurant.name}
                    </h3>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shrink-0">
                        <Star className="w-3 h-3 fill-white" />
                        <span>{Number(restaurant.rating || 4.3).toFixed(1)}</span>
                    </div>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        {restaurant.deliveryTimeMinutes || 28} mins
                    </span>
                    <span>•</span>
                    <span>₹{restaurant.avgPriceForTwo || 350} for two</span>
                    {restaurant.distanceKm && (
                        <>
                            <span>•</span>
                            <span>{restaurant.distanceKm} km</span>
                        </>
                    )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {(restaurant.cuisines || []).join(", ")}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {restaurant.address?.area || "Bengaluru"}
                    </span>
                    <span
                        className={`font-semibold ${restaurant.isOpen ? "text-emerald-500" : "text-red-500"
                            }`}
                    >
                        {restaurant.isOpen ? "Open Now" : "Closed"}
                    </span>
                </div>

                {showRecommendationBadge && restaurant.matchReason && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-[11px] font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{restaurant.matchReason}</span>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default RestaurantCard;

