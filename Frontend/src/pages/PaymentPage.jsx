import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ShieldCheck,
    CreditCard,
    CheckCircle2,
    XCircle,
    Lock,
    Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const PaymentPage = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [paymentData, setPaymentData] = useState(null);
    const [method, setMethod] = useState("UPI");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const initPaymentOrder = async () => {
            setLoading(true);
            try {
                const res = await api.post("/payments/create-order", { orderId });
                setPaymentData(res.data?.data);
            } catch (err) {
                toast.error(err.response?.data?.message || "Failed to initialize payment");
            } finally {
                setLoading(false);
            }
        };
        initPaymentOrder();
    }, [orderId]);

    const handleVerifiedSuccessPayment = async () => {
        if (!paymentData?.testSandboxPayload) return;
        setProcessing(true);
        try {
            await api.post("/payments/verify", {
                orderId,
                ...paymentData.testSandboxPayload,
                method,
            });
            toast.success("Razorpay HMAC SHA256 Signature Verified! Order Paid.");
            navigate(`/orders/${orderId}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Payment verification failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleSimulateFailure = async () => {
        setProcessing(true);
        try {
            await api.post("/payments/failure", {
                orderId,
                razorpay_order_id: paymentData?.razorpayOrderId,
                reason: "Simulated bank decline by customer in test mode",
            });
            toast.error("Simulated payment failure recorded (Fraud risk counter incremented).");
        } catch {
            toast.error("Failed to record payment failure");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-lg mx-auto px-4 py-16">
                <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-12">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                            Razorpay Test Sandbox
                        </span>
                        <h1 className="text-xl font-extrabold mt-1">ZingBite Secure Checkout</h1>
                        <p className="text-xs text-blue-100 mt-0.5">
                            Order ID: {paymentData?.razorpayOrderId}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-blue-100 block">Amount</span>
                        <span className="text-2xl font-extrabold">
                            ₹{(paymentData?.amount || 0) / 100}
                        </span>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                            Choose Test Payment Instrument
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { id: "UPI", label: "UPI / GPay", icon: Smartphone },
                                { id: "CARD", label: "Credit/Debit", icon: CreditCard },
                                { id: "NETBANKING", label: "NetBanking", icon: Lock },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setMethod(item.id)}
                                        className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer ${
                                            method === item.id
                                                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                                : "border-slate-200 dark:border-slate-800"
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>HMAC SHA256 Signature Verification Active</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Backend verifies cryptographic signature before marking order Paid.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleVerifiedSuccessPayment}
                            disabled={processing}
                            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>
                                {processing
                                    ? "Verifying Signature..."
                                    : `Simulate Verified Payment (₹${(paymentData?.amount || 0) / 100})`}
                            </span>
                        </button>

                        <button
                            onClick={handleSimulateFailure}
                            disabled={processing}
                            className="w-full py-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <XCircle className="w-4 h-4" />
                            <span>Simulate Failed Payment (Increments Fraud Counter)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;

