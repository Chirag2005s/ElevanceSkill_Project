import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Customer Pages (14 Pages)
import HomePage from "./pages/HomePage";
import RestaurantListingPage from "./pages/RestaurantListingPage";
import RestaurantDetailsPage from "./pages/RestaurantDetailsPage";
import FoodDetailsPage from "./pages/FoodDetailsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import MyProfilePage from "./pages/MyProfilePage";
import WishlistPage from "./pages/WishlistPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Role Dashboards
import AdminDashboardPage from "./pages/AdminDashboardPage";
import RestaurantDashboardPage from "./pages/RestaurantDashboardPage";
import DeliveryDashboardPage from "./pages/DeliveryDashboardPage";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            borderRadius: "14px",
                            background: "#0f172a",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                        },
                    }}
                />
                <Navbar />
                <main className="flex-1">
                    <Routes>
                        {/* Public & Customer Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/restaurants" element={<RestaurantListingPage />} />
                        <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />
                        <Route path="/foods/:id" element={<FoodDetailsPage />} />
                        <Route path="/search" element={<SearchResultsPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Authenticated Customer Routes */}
                        <Route
                            path="/checkout"
                            element={
                                <ProtectedRoute>
                                    <CheckoutPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/payment/:orderId"
                            element={
                                <ProtectedRoute>
                                    <PaymentPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/orders/:orderId"
                            element={
                                <ProtectedRoute>
                                    <OrderTrackingPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/my-orders"
                            element={
                                <ProtectedRoute>
                                    <MyOrdersPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute>
                                    <MyProfilePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/wishlist"
                            element={
                                <ProtectedRoute>
                                    <WishlistPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* Role-Specific Portals */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allowedRoles={["admin"]}>
                                    <AdminDashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/restaurant-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["restaurant", "admin"]}>
                                    <RestaurantDashboardPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/delivery-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={["delivery", "admin"]}>
                                    <DeliveryDashboardPage />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}

export default App;
