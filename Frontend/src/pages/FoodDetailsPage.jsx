import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Star, Clock, Flame, ArrowLeft, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { addToCart } from "../store/cartSlice";

const FoodDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [food, setFood] = useState(null);
    const [relatedFoods, setRelatedFoods] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFood = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/foods/${id}`);
                if (res.data?.data) {
                    setFood(res.data.data.food);
                    setRelatedFoods(res.data.data.relatedFoods || []);
                }
            } catch {
                toast.error("Food item not found");
            } finally {
                setLoading(false);
            }
        };
        fetchFood();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    if (!food) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h2 className="text-xl font-bold">Food item not found</h2>
                <Link to="/restaurants" className="text-orange-500 font-bold text-sm mt-3 block">
                    Browse Restaurants
                </Link>
            </div>
        );
    }

    const toggleAddon = (addon) => {
        setSelectedAddons((prev) =>
            prev.some((a) => a.name === addon.name)
                ? prev.filter((a) => a.name !== addon.name)
                : [...prev, addon]
        );
    };

    const handleAddToCart = () => {
        dispatch(
            addToCart({
                food,
                restaurant: food.restaurant,
                quantity,
                addons: selectedAddons,
            })
        );
        toast.success(`Added ${quantity}x ${food.name} to cart!`);
        navigate("/cart");
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-500 mb-6 cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Menu</span>
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg grid grid-cols-1 md:grid-cols-2">
                <div className="h-72 md:h-auto bg-slate-100 dark:bg-slate-800">
                    <img
                        src={food.image}
                        alt={food.name}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${food.isVeg
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {food.isVeg ? "100% Vegetarian" : "Non-Vegetarian"}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                                <Star className="w-4 h-4 fill-amber-400" /> {food.rating} (
                                {food.totalRatings} ratings)
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                            {food.name}
                        </h1>

                        {food.restaurant && (
                            <Link
                                to={`/restaurants/${food.restaurant._id}`}
                                className="text-xs font-bold text-orange-500 hover:underline block"
                            >
                                Prepared by {food.restaurant.name} •{" "}
                                {food.restaurant.deliveryTimeMinutes} mins
                            </Link>
                        )}

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {food.description}
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2 text-xs font-semibold text-slate-500">
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                Prep: {food.preparationTimeMinutes} mins
                            </span>
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                                <Flame className="w-3.5 h-3.5 text-red-500" />
                                Spice: {food.spiceLevel}
                            </span>
                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                                {food.calories} kcal • {food.serves}
                            </span>
                        </div>

                        {/* Addons */}
                        {food.addons && food.addons.length > 0 && (
                            <div className="pt-3">
                                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                                    Customize with Add-ons
                                </h4>
                                <div className="space-y-2">
                                    {food.addons.map((addon) => {
                                        const checked = selectedAddons.some(
                                            (a) => a.name === addon.name
                                        );
                                        return (
                                            <label
                                                key={addon.name}
                                                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer text-xs font-semibold"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleAddon(addon)}
                                                        className="accent-orange-500"
                                                    />
                                                    <span>{addon.name}</span>
                                                </div>
                                                <span>+₹{addon.price}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div>
                            <span className="text-xs text-slate-400 block">Total Price</span>
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                ₹
                                {((food.discountPrice || food.price) +
                                    selectedAddons.reduce((s, a) => s + a.price, 0)) *
                                    quantity}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="cursor-pointer px-1"
                                >
                                    -
                                </button>
                                <span>{quantity}</span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="cursor-pointer px-1"
                                >
                                    +
                                </button>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 cursor-pointer"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Add to Cart</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {relatedFoods.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-xl font-extrabold mb-4">
                        More from {food.restaurant?.name}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {relatedFoods.map((rf) => (
                            <Link
                                key={rf._id}
                                to={`/foods/${rf._id}`}
                                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 hover:border-orange-500 transition-colors"
                            >
                                <img
                                    src={rf.image}
                                    alt={rf.name}
                                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                                />
                                <div className="truncate">
                                    <h4 className="font-bold text-sm truncate">{rf.name}</h4>
                                    <span className="text-xs font-extrabold text-orange-500">
                                        ₹{rf.discountPrice || rf.price}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FoodDetailsPage;

