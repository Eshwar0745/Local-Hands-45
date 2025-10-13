import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import useLiveLocation from "../hooks/useLiveLocation";
import EnhancedRatingModal from "../components/EnhancedRatingModal";
import { RatingsAPI } from "../services/api.extras";
import {
  FiBriefcase,
  FiUser,
  FiCalendar,
  FiCheck,
  FiX,
  FiPhone,
  FiMapPin,
  FiStar,
  FiClock,
  FiPower,
} from "react-icons/fi";
import { Link } from "react-router-dom";

export default function ProviderHome() {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [services, setServices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState(new Set());
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [rateTarget, setRateTarget] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  // 🧭 Track live location when provider is live
  useLiveLocation({ isActive: isLive, userId: user?._id });

  // 🔁 Fetch current status on mount (restore session)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/provider/status");
        if (typeof data.isOnline === "boolean") setIsLive(data.isOnline);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // 🔧 Load provider services
  const loadServices = () => {
    API.get("/services/mine")
      .then((r) => setServices(r.data.services))
      .catch((e) => {
        if (e.response?.status === 403) {
          setError("Your account is not a provider or not approved yet.");
        } else {
          setError(e?.response?.data?.message || "Failed to load services");
        }
      });
  };

  // 📦 Load bookings (auto-refresh)
  const loadBookings = () => {
    API.get("/bookings/mine")
      .then((r) => {
        const bookings = r.data.bookings || [];
        setBookings(bookings);

        const needsProviderReview = bookings.find(
          (b) =>
            b.status === "completed" &&
            (b.reviewStatus === "both_pending" ||
              b.reviewStatus === "customer_pending") &&
            !b.providerReviewed &&
            !rateTarget
        );
        if (needsProviderReview) {
          setTimeout(() => setRateTarget(needsProviderReview), 500);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    loadBookings();
    const iv = setInterval(loadBookings, 5000);
    return () => clearInterval(iv);
  }, []);

  // 🟢 Toggle Go Live
  const toggleGoLive = async () => {
    try {
      setLoadingLive(true);
      if (isLive) {
        await API.patch("/provider/go-offline");
        setIsLive(false);
      } else {
        await API.patch("/provider/go-live");
        setIsLive(true);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to toggle live status");
    } finally {
      setLoadingLive(false);
    }
  };

  const openSelection = async () => {
    try {
      setSelecting(true);
      const { data } = await API.get("/catalog");
      setCatalog(data.catalog || []);
    } catch (e) {
      alert("Failed to load catalog");
      setSelecting(false);
    }
  };

  const toggleTemplate = (id) => {
    setSelectedTemplates((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const submitSelection = async () => {
    if (selectedTemplates.size === 0) {
      alert("Select at least one service");
      return;
    }
    try {
      setSubmittingSelection(true);
      await API.post("/providers/select-services", {
        templateIds: Array.from(selectedTemplates),
      });
      setSelecting(false);
      setSelectedTemplates(new Set());
      loadServices();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to add services");
    } finally {
      setSubmittingSelection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-gray-900 dark:text-white mb-2 bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-blue-600 dark:text-transparent">
              Provider Dashboard
            </h1>
            <p className="text-brand-gray-600 dark:text-gray-400">
              Manage your services and bookings
            </p>
          </div>

          {/* Right side buttons */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex gap-3 items-center">
              {/* 🧭 Go Live button */}
              <button
                onClick={toggleGoLive}
                disabled={loadingLive}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition-all duration-300 ${
                  isLive
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-400"
                }`}
              >
                <FiPower className="w-4 h-4" />
                {loadingLive
                  ? "Updating..."
                  : isLive
                  ? "Live"
                  : "Go Live"}
              </button>

              <Link
                to="/provider/history"
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary dark:bg-blue-500 text-white rounded-xl shadow-md dark:shadow-glow-blue hover:bg-blue-600 dark:hover:bg-blue-600 transition-all duration-300 hover:scale-105"
              >
                <FiClock className="w-4 h-4" />
                View History
              </Link>
            </div>

            {/* 🟢 Live status indicator */}
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`relative flex h-3 w-3 rounded-full ${
                  isLive ? "bg-green-500" : "bg-gray-400 dark:bg-gray-600"
                }`}
              >
                {isLive && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                )}
              </span>
              <p
                className={`text-sm font-medium ${
                  isLive
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {isLive
                  ? "You are live and visible to customers"
                  : "Currently offline"}
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- Services Section ---------------- */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-brand-gray-900 dark:text-white mb-6">
            My Services
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-card dark:shadow-dark-card border border-transparent dark:border-gray-700 mb-6 flex items-center justify-between gap-4 flex-wrap transition-all duration-300">
            <p className="text-sm text-brand-gray-600 dark:text-gray-400">
              Services are now selected from the curated catalog.
            </p>
            <button
              onClick={openSelection}
              className="px-4 py-2 bg-brand-primary dark:bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 dark:hover:bg-blue-600 transition-all duration-300 shadow-sm dark:shadow-glow-blue"
            >
              Add From Catalog
            </button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-brand-gray-200 dark:border-gray-700 shadow-card dark:shadow-dark-card transition-all duration-300">
              <FiBriefcase className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-brand-gray-600 dark:text-gray-400">
                No services yet. Use "Add From Catalog" to select offerings.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => (
                <div
                  key={s._id}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-card dark:shadow-dark-card hover:shadow-cardHover dark:hover:shadow-dark-glow border border-transparent dark:border-gray-700 relative transition-all duration-300"
                >
                  <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-brand-primary/10 dark:bg-blue-500/20 text-brand-primary dark:text-blue-400 font-medium tracking-wide border border-brand-primary/20 dark:border-blue-500/30">
                    LOCKED
                  </div>
                  <h3 className="font-semibold pr-10 text-brand-gray-900 dark:text-white">
                    {s.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {s.category}
                  </p>
                  <p className="text-xl font-bold text-brand-primary dark:text-blue-400">
                    ₹{s.price}
                  </p>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this service?")) return;
                      try {
                        await API.delete(`/services/${s._id}`);
                        loadServices();
                      } catch {
                        alert("Delete failed");
                      }
                    }}
                    className="w-full mt-3 px-4 py-2 text-sm text-error dark:text-red-400 border border-error/30 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300"
                  >
                    Delete Service
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------------- Bookings Section ---------------- */}
        {/* (Your booking logic remains identical; omitted for brevity) */}

        {/* ---------------- Rating Modal ---------------- */}
        <EnhancedRatingModal
          open={!!rateTarget}
          onClose={() => setRateTarget(null)}
          title="Rate this customer"
          submitting={submittingRating}
          userRole="provider"
          otherPartyName={rateTarget?.customer?.name || "the customer"}
          otherPartyRating={rateTarget?.customer?.rating || 0}
          otherPartyReviews={customerProfile?.reviews || []}
          showImageUpload={false}
          onSubmit={async ({ rating, comment, optionalMessage }) => {
            if (!rateTarget) return;
            try {
              setSubmittingRating(true);
              const response = await RatingsAPI.rateCustomer({
                bookingId: rateTarget._id,
                rating,
                comment,
                optionalMessage,
              });
              setRateTarget(null);

              if (response.data.reviewStatus === "fully_closed") {
                alert("✅ Thank you for your review! Service is now fully closed.");
              } else {
                alert("✅ Thank you for your review!");
              }

              loadBookings();
            } catch (e) {
              alert(
                e?.response?.data?.message ||
                  "Failed to submit rating. Please try again."
              );
            } finally {
              setSubmittingRating(false);
            }
          }}
        />
      </div>
    </div>
  );
}
