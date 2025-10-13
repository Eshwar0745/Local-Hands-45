import React, { useState, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import LogoReveal from "./components/LogoReveal";
import { AnimatePresence, motion } from "framer-motion";
import { ToastProvider } from "./components/Toast";

// 🧭 Navbars
import PublicNavbar from "./components/PublicNavbar";
import CustomerNavbar from "./components/CustomerNavbar";
import ProviderNavbar from "./components/ProviderNavbar";
import AdminNavbar from "./components/AdminNavbar";

// 🧾 Pages
import HomePage from "./pages/HomePage";
import CustomerHome from "./pages/CustomerHome";
import ProviderHome from "./pages/ProviderHome";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoleSelectPage from "./pages/RoleSelectPage";
import CustomerHistory from "./pages/CustomerHistory";
import ProviderHistory from "./pages/ProviderHistory";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerificationsPage from "./pages/AdminVerificationsPage";
import ProviderVerificationPage from "./pages/ProviderVerificationPage";
import WelcomePage from "./pages/WelcomePage";
import ForgotPassword from "./pages/ForgotPassword";

// 🌍 New Map Pages (Leaflet-based)
import CustomerTrackProvider from "./pages/CustomerTrackProvider";
import NearbyProvidersMap from "./pages/NearbyProvidersMap";

export default function App() {
  const { user, loading } = useAuth();

  // ✅ Skip logo reveal after first visit
  const [logoDone, setLogoDone] = useState(() => {
    return sessionStorage.getItem("logo_seen") === "true";
  });

  // ✅ Normalize role to lowercase for safety
  const normalizedRole = useMemo(
    () => (user?.role ? String(user.role).trim().toLowerCase() : null),
    [user?.role]
  );

  const NavbarComponent = useMemo(() => {
    switch (normalizedRole) {
      case "customer":
        return CustomerNavbar;
      case "provider":
        return ProviderNavbar;
      case "admin":
        return AdminNavbar;
      default:
        return PublicNavbar;
    }
  }, [normalizedRole]);

  // 🔄 Small loader while Firebase/AuthContext initializes
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const fadeVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  const handleLogoComplete = () => {
    setLogoDone(true);
    sessionStorage.setItem("logo_seen", "true");
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300">
        {/* 🎬 Logo Reveal */}
        <AnimatePresence>
          {!logoDone && <LogoReveal onComplete={handleLogoComplete} />}
        </AnimatePresence>

        {/* 🧭 Navbar after logo */}
        {logoDone && (
          <AnimatePresence mode="wait">
            <motion.div
              key={user?.role || "public"}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={fadeVariants}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <NavbarComponent />
            </motion.div>
          </AnimatePresence>
        )}

        {/* 🚀 Routes */}
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Role Selection */}
            <Route
              path="/choose-role"
              element={
                <ProtectedRoute>
                  {user?.role ? (
                    <Navigate to="/welcome" replace />
                  ) : (
                    <RoleSelectPage />
                  )}
                </ProtectedRoute>
              }
            />

            {/* Welcome */}
            <Route
              path="/welcome"
              element={
                <ProtectedRoute>
                  <WelcomePage />
                </ProtectedRoute>
              }
            />

            {/* Customer */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer"]}>
                    <CustomerHome />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/history"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer"]}>
                    <CustomerHistory />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* 🌍 Customer Map Pages */}
            <Route
              path="/customer/track/:providerId"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer"]}>
                    <CustomerTrackProvider />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/nearby"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer"]}>
                    <NearbyProvidersMap />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Provider */}
            <Route
              path="/provider"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["provider"]}>
                    <ProviderHome />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/dashboard"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["provider"]}>
                    <ProviderHome />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/verification"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["provider"]}>
                    <ProviderVerificationPage />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/history"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["provider"]}>
                    <ProviderHistory />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin"]}>
                    <AdminDashboard />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin"]}>
                    <AdminVerificationsPage />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
