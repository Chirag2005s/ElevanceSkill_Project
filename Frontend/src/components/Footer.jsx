import React from "react";
import { Link } from "react-router-dom";
import { Flame, ShieldCheck, Zap, MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
    return (
        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                                <Flame className="w-5 h-5 fill-white" />
                            </div>
                            <span className="text-xl font-extrabold text-white">
                                Zing<span className="text-orange-500">Bite</span>
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Next-generation online food delivery platform engineered with real-time
                            Socket.IO tracking, dynamic surge pricing, geospatial rider routing, and
                            AI-driven restaurant recommendations.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Discover
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link to="/restaurants" className="hover:text-orange-400 transition-colors">
                                    All Restaurants
                                </Link>
                            </li>
                            <li>
                                <Link to="/search?vegetarian=true" className="hover:text-orange-400 transition-colors">
                                    Pure Veg Delights
                                </Link>
                            </li>
                            <li>
                                <Link to="/search?sortBy=rating" className="hover:text-orange-400 transition-colors">
                                    Top Rated Near You
                                </Link>
                            </li>
                            <li>
                                <Link to="/cart" className="hover:text-orange-400 transition-colors">
                                    Active Promo Offers
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Partner Portals
                        </h4>
                        <ul className="space-y-2.5 text-sm">
                            <li>
                                <Link to="/login" className="hover:text-orange-400 transition-colors">
                                    Restaurant Partner Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:text-orange-400 transition-colors">
                                    Delivery Partner Portal
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:text-orange-400 transition-colors">
                                    Enterprise Admin Control Center
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">
                            Platform Capabilities
                        </h4>
                        <div className="space-y-3 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Real-Time Fraud Risk Scoring Engine</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>Dynamic Peak & Surge Delivery Pricing</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                                <span>2dsphere Geospatial Rider Assignment</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
                    <p>© {new Date().getFullYear()} ZingBite Technologies Pvt. Ltd. All rights reserved.</p>
                    <p>Built with React 19, Redux Toolkit, Node.js, Express, MongoDB Atlas, Redis & Socket.IO</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

