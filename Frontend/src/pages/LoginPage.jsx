import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Flame, Lock, Mail, Zap, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { setCredentials } from "../store/authSlice";

const DEMO_ACCOUNTS = [
    {
        role: "Customer",
        email: "customer@zingbite.com",
        password: "Customer@123",
        badge: "bg-emerald-100 text-emerald-700",
        redirect: "/",
    },
    {
        role: "Platform Admin",
        email: "admin@zingbite.com",
        password: "Admin@123",
        badge: "bg-purple-100 text-purple-700",
        redirect: "/admin",
    },
    {
        role: "Restaurant Owner",
        email: "owner@zingbite.com",
        password: "Owner@123",
        badge: "bg-orange-100 text-orange-700",
        redirect: "/restaurant-dashboard",
    },
    {
        role: "Delivery Partner",
        email: "rider@zingbite.com",
        password: "Rider@123",
        badge: "bg-blue-100 text-blue-700",
        redirect: "/delivery-dashboard",
    },
    {
        role: "Flagged High-Risk User",
        email: "rohan.flagged@zingbite.com",
        password: "Customer@123",
        badge: "bg-red-100 text-red-700",
        redirect: "/",
    },
];

const LoginPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [email, setEmail] = useState("customer@zingbite.com");
    const [password, setPassword] = useState("Customer@123");
    const [loading, setLoading] = useState(false);

    const performLogin = async (loginEmail, loginPassword, customRedirect = null) => {
        setLoading(true);
        try {
            const res = await api.post("/auth/login", {
                email: loginEmail,
                password: loginPassword,
            });
            if (res.data?.data) {
                dispatch(setCredentials(res.data.data));
                const userRole = res.data.data.user?.role;
                toast.success(`Welcome back, ${res.data.data.user?.name}!`);

                if (customRedirect) {
                    navigate(customRedirect);
                } else if (userRole === "admin") {
                    navigate("/admin");
                } else if (userRole === "restaurant") {
                    navigate("/restaurant-dashboard");
                } else if (userRole === "delivery") {
                    navigate("/delivery-dashboard");
                } else {
                    navigate("/");
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid login credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        performLogin(email, password);
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                {/* Left Column: Login Form */}
                <div className="md:col-span-7 p-8 sm:p-10 space-y-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                            <Flame className="w-5 h-5 fill-white" />
                        </div>
                        <span className="text-2xl font-extrabold">
                            Zing<span className="text-orange-500">Bite</span>
                        </span>
                    </div>

                    <div>
                        <h1 className="text-2xl font-extrabold">Sign in to your account</h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Protected by HTTP-only JWT cookies & Role-Based Access Control
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 cursor-pointer transition-colors"
                        >
                            {loading ? "Signing In..." : "Sign In"}
                        </button>
                    </form>

                    <p className="text-xs text-slate-500 text-center">
                        New to ZingBite?{" "}
                        <Link to="/register" className="text-orange-500 font-bold hover:underline">
                            Create an account
                        </Link>
                    </p>
                </div>

                {/* Right Column: 1-Click Demo Credentials Switcher (Section 13) */}
                <div className="md:col-span-5 bg-slate-50 dark:bg-slate-800/60 p-8 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-orange-500 font-extrabold text-xs uppercase tracking-wider">
                            <Zap className="w-4 h-4" />
                            <span>1-Click Demo Role Login</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Click any seeded demo role below to automatically populate credentials
                            and sign in to its dedicated portal:
                        </p>

                        <div className="space-y-2.5">
                            {DEMO_ACCOUNTS.map((acc) => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    onClick={() => {
                                        setEmail(acc.email);
                                        setPassword(acc.password);
                                        performLogin(acc.email, acc.password, acc.redirect);
                                    }}
                                    className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-orange-500 text-left transition-all cursor-pointer shadow-2xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs">{acc.role}</span>
                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${acc.badge}`}
                                        >
                                            Instant Login →
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 block mt-1">
                                        {acc.email} • {acc.password}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

