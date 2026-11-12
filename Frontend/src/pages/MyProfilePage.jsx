import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    User,
    ShieldCheck,
    MapPin,
    Trash2,
    CreditCard,
    Save,
    AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import { updateUserState } from "../store/authSlice";

const MyProfilePage = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [name, setName] = useState(user?.name || "");
    const [phone, setPhone] = useState(user?.phone || "");
    const [saving, setSaving] = useState(false);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        api.get("/payments/history")
            .then((res) => setPayments(res.data?.data?.payments || []))
            .catch(() => { });
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put("/users/profile", { name, phone });
            if (res.data?.data?.user) {
                dispatch(updateUserState(res.data.data.user));
                toast.success("Profile updated!");
            }
        } catch {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAddress = async (addrId) => {
        try {
            const res = await api.delete(`/users/addresses/${addrId}`);
            if (res.data?.data?.savedAddresses) {
                dispatch(updateUserState({ savedAddresses: res.data.data.savedAddresses }));
                toast.success("Address deleted");
            }
        } catch {
            toast.error("Failed to remove address");
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <h1 className="text-3xl font-extrabold">My Account & Security Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Form & Fraud Security Standing */}
                <div className="lg:col-span-6 space-y-6">
                    <form
                        onSubmit={handleSaveProfile}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-500" />
                            <span>Personal Information</span>
                        </h3>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Email Address (Verified)
                            </label>
                            <input
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800/50 text-slate-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Phone Number
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? "Saving..." : "Save Changes"}</span>
                        </button>
                    </form>

                    {/* Task 1 Account Risk Standing Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <span>Fraud Protection Standing (Task 1)</span>
                            </h3>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-extrabold ${(user?.riskScore || 0) > 70
                                        ? "bg-red-100 text-red-700"
                                        : (user?.riskScore || 0) >= 50
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-emerald-100 text-emerald-700"
                                    }`}
                            >
                                {user?.riskLevel || "Low"} Risk (Score: {user?.riskScore || 0})
                            </span>
                        </div>

                        {user?.isRestricted ? (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-xs flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>
                                    Account Restricted: {user.restrictionReason || "Under review"}
                                </span>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">
                                Your account is in good standing with full ordering, coupon, and
                                instant refund privileges.
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column: Saved Addresses & Payment History */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span>Saved Delivery Addresses</span>
                        </h3>

                        <div className="space-y-3">
                            {(user?.savedAddresses || []).map((addr) => (
                                <div
                                    key={addr._id}
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                                >
                                    <div>
                                        <span className="text-xs font-extrabold uppercase text-orange-500">
                                            {addr.label}
                                        </span>
                                        <p className="text-xs font-semibold mt-0.5">{addr.street}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {addr.city} - {addr.pincode}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAddress(addr._id)}
                                        className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-orange-500" />
                            <span>Recent Payment Transactions</span>
                        </h3>

                        {payments.length === 0 ? (
                            <p className="text-xs text-slate-500">No online payment records yet.</p>
                        ) : (
                            <div className="space-y-2.5 max-h-64 overflow-y-auto">
                                {payments.map((p) => (
                                    <div
                                        key={p._id}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <span className="font-bold block">
                                                {p.razorpayOrderId}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                {new Date(p.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-extrabold block">
                                                ₹{p.amount}
                                            </span>
                                            <span
                                                className={`text-[10px] font-bold uppercase ${p.status === "captured"
                                                        ? "text-emerald-500"
                                                        : p.status === "failed"
                                                            ? "text-red-500"
                                                            : "text-amber-500"
                                                    }`}
                                            >
                                                {p.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfilePage;

