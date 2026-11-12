import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Flame } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { setCredentials } from "../store/authSlice";

const RegisterPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "customer",
        street: "100 Feet Road, Indiranagar",
        city: "Bengaluru",
        pincode: "560038",
        restaurantName: "",
        cuisines: "North Indian, Biryani",
        vehicleType: "Bike",
        vehicleNumber: "KA-01-ZB-9090",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/auth/register", formData);
            if (res.data?.data) {
                dispatch(setCredentials(res.data.data));
                toast.success("Account registered successfully!");
                const role = res.data.data.user?.role;
                if (role === "restaurant") navigate("/restaurant-dashboard");
                else if (role === "delivery") navigate("/delivery-dashboard");
                else navigate("/");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                        <Flame className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold">Create Your ZingBite Account</h1>
                        <p className="text-xs text-slate-500">
                            Join as a Customer, Restaurant Partner, or Delivery Rider
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Select Account Role
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "customer", label: "Customer" },
                                { id: "restaurant", label: "Restaurant" },
                                { id: "delivery", label: "Delivery Rider" },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() =>
                                        setFormData((prev) => ({ ...prev, role: r.id }))
                                    }
                                    className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${formData.role === r.id
                                            ? "bg-orange-500 text-white border-orange-500"
                                            : "border-slate-200 dark:border-slate-700"
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder="Aarav Sharma"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.phone}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, phone: e.target.value }))
                                }
                                placeholder="9845012345"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, email: e.target.value }))
                                }
                                placeholder="you@example.com"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData((p) => ({ ...p, password: e.target.value }))
                                }
                                placeholder="Min 6 characters"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    {formData.role === "restaurant" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Restaurant Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.restaurantName}
                                    onChange={(e) =>
                                        setFormData((p) => ({
                                            ...p,
                                            restaurantName: e.target.value,
                                        }))
                                    }
                                    placeholder="Spice Symphony Kitchen"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Cuisines
                                </label>
                                <input
                                    type="text"
                                    value={formData.cuisines}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, cuisines: e.target.value }))
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>
                        </div>
                    )}

                    {formData.role === "delivery" && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Vehicle Type
                                </label>
                                <select
                                    value={formData.vehicleType}
                                    onChange={(e) =>
                                        setFormData((p) => ({ ...p, vehicleType: e.target.value }))
                                    }
                                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                >
                                    <option value="Bike">Bike</option>
                                    <option value="Electric Scooter">Electric Scooter</option>
                                    <option value="Scooter">Scooter</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                    Vehicle Reg No.
                                </label>
                                <input
                                    type="text"
                                    value={formData.vehicleNumber}
                                    onChange={(e) =>
                                        setFormData((p) => ({
                                            ...p,
                                            vehicleNumber: e.target.value,
                                        }))
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 cursor-pointer"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-xs text-slate-500 text-center">
                    Already have an account?{" "}
                    <Link to="/login" className="text-orange-500 font-bold hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;

