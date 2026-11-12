import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { addToCart, updateItemQuantity } from "../store/cartSlice";

const RestaurantDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { items: cartItems } = useSelector((state) => state.cart);
    const { isAuthenticated } = useSelector((state) => state.auth);

    const [restaurant, setRestaurant] = useState(null);
    const [foods, setFoods] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState("All");
    const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
    const [menuSearch, setMenuSearch] = useState("");

    // Review form state
    const [ratingInput, setRatingInput] = useState(5);
    const [commentInput, setCommentInput] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/restaurants/${id}`);
                if (res.data?.data) {
                    setRestaurant(res.data.data.restaurant);
                    setFoods(res.data.data.foods || []);
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

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shrink-0">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 font-extrabold text-2xl">
                            <Star className="w-6 h-6 fill-emerald-400" />
                            <span>{Number(restaurant.rating || 4.5).toFixed(1)}</span>
                        </div>
                        <span className="text-[11px] text-slate-300 block mt-0.5">
                            {restaurant.totalRatings || 100}+ Verified Ratings
                        </span>
                    </div>
                </div>
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

