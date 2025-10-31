import React, { useEffect, useRef, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiPhone,
  FiCheckCircle,
  FiAlertCircle,
  FiNavigation,
  FiSearch,
  FiMaximize2,
  FiX,
  FiLock,
  FiShield,
  FiUpload,
} from "react-icons/fi";
import { useToast } from "../components/Toast";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useTheme } from "next-themes";
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from "react-places-autocomplete";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FiBriefcase } from "react-icons/fi";
import ServiceSelectionModal from "../components/ServiceSelectionModal";

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Blue pulsing dot for “You are here”
const blueDot = L.divIcon({
  html: `
    <div style="
      width:16px;height:16px;
      background:#1E90FF;border:2px solid white;
      border-radius:50%;box-shadow:0 0 10px rgba(30,144,255,0.6);
      animation:pulse 1.5s infinite;
    "></div>`,
  className: "",
  iconSize: [16, 16],
});

// Pulse animation
const style = document.createElement("style");
style.innerHTML = `
@keyframes pulse {
  0% {transform:scale(1);opacity:1;}
  50% {transform:scale(1.6);opacity:0.6;}
  100% {transform:scale(1);opacity:1;}
}`;
document.head.appendChild(style);

// Distance calculator
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Handles marker clicks
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} icon={customIcon} /> : null;
}

function LiveLocationMarker({ livePosition }) {
  return livePosition ? <Marker position={livePosition} icon={blueDot} /> : null;
}

function MapAutoResize({ center }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    setTimeout(() => {
      map.invalidateSize();
      map.flyTo(center, map.getZoom() || 15);
    }, 300);
  }, [map, center]);
  return null;
}

export default function ProfilePage() {
  const { user, saveSession } = useAuth();
  const { theme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    preciseAddress: user?.preciseAddress || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [position, setPosition] = useState(null);
  const [livePosition, setLivePosition] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(!user);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [showMapFull, setShowMapFull] = useState(false);
  const [lastZoom, setLastZoom] = useState(15);
  const fetchGuard = useRef(false);
  const [myServices, setMyServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Load profile
  useEffect(() => {
    if (fetchGuard.current) return;
    fetchGuard.current = true;
    const loadProfile = async () => {
      try {
        const res = await API.get("/users/me");
        const u = res.data.user || {};
        setForm({
          name: u.name || "",
          phone: u.phone || "",
          address: u.address || "",
          preciseAddress: u.preciseAddress || "",
        });
        if (u.location?.lat && u.location?.lng) {
          setPosition([u.location.lat, u.location.lng]);
        } else {
          // Default fallback (KMIT coordinates)
          setPosition([17.4033, 78.4897]);
        }
        
        // ✅ Update AuthContext with fresh user data (especially onboardingStatus)
        // This ensures license verification status is always up-to-date
        saveSession(null, { ...user, ...u });

        // If provider, also fetch their selected services (skills)
        if ((u.role || user?.role) === 'provider') {
          try {
            setServicesLoading(true);
            const prof = await API.get(`/providers/${u._id || user?._id}/profile`);
            setMyServices(prof.data?.services || []);
          } catch (e) {
            console.warn('Failed to load provider services', e?.message);
          } finally { setServicesLoading(false); }
        }
      } catch (e) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Reverse geocoding (lat → address)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data.display_name) {
        setForm((f) => ({ ...f, address: data.display_name }));
      }
    } catch (e) {
      console.error("Reverse geocode failed:", e);
    }
  };

  // Locate Me (GPS)
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLivePosition([latitude, longitude]);
        setPosition([latitude, longitude]);
        await reverseGeocode(latitude, longitude);
        if (position) {
          const km = haversineDistance(
            position[0],
            position[1],
            latitude,
            longitude
          );
          setDistance(
            km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`
          );
        }
        setLocating(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to fetch your location. Please enable GPS.");
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const payload = { ...form };
      if (position) {
        payload.location = { lat: position[0], lng: position[1] };
      }
      const { data } = await API.patch("/users/me", payload);
      setMsg("Profile updated successfully ✅");
      saveSession(null, { ...user, ...data.user });
    } catch (e) {
      setError(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      addToast("Please fill all password fields", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast("New passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await API.post("/auth/change-password", {
        oldPassword,
        newPassword,
      });
      addToast(data.message || "Password changed successfully!", "success");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      addToast(
        e.response?.data?.message || "Failed to change password",
        "error"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 dark:text-gray-400">
        Loading profile...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] transition-all duration-300">
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">My Profile</h1>
            <span className="text-sm opacity-75 capitalize">{user.role}</span>
          </div>

          <div className="p-6">
            {(msg || error) && (
              <div
                className={`mb-4 flex items-center gap-2 px-3 py-2 text-sm rounded-lg border ${
                  error
                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {error ? <FiAlertCircle /> : <FiCheckCircle />}
                {error || msg}
              </div>
            )}

            {/* ✅ License Verification Section for Providers */}
            {user?.role === 'provider' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FiShield className="w-4 h-4" />
                  License Verification Status
                </h3>
                
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.onboardingStatus === 'approved' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : user.onboardingStatus === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : user.onboardingStatus === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                      }`}>
                        {user.onboardingStatus === 'approved' ? '✓ Approved' 
                          : user.onboardingStatus === 'rejected' ? '✗ Rejected'
                          : user.onboardingStatus === 'pending' ? '⏳ Pending Review'
                          : '⚠️ Not Submitted'}
                      </span>
                    </div>
                    
                    {/* Upload/Manage License Button */}
                    {(user.onboardingStatus !== 'approved' && user.onboardingStatus !== 'pending') && (
                      <button
                        onClick={() => navigate('/provider/verification')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <FiUpload className="w-3.5 h-3.5" />
                        {user.onboardingStatus === 'rejected' ? 'Resubmit' : 'Upload License'}
                      </button>
                    )}
                    
                    {user.onboardingStatus === 'pending' && (
                      <button
                        onClick={() => navigate('/provider/verification')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </div>

                  {/* Not Submitted Message */}
                  {!user.onboardingStatus || user.onboardingStatus === 'not_submitted' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-900 dark:text-blue-300">
                        📋 You need to upload your government ID for verification before you can accept bookings and go live.
                      </p>
                    </div>
                  )}

                  {/* License Image */}
                  {user.licenseImage && (
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Uploaded License:</p>
                      <div className="relative group">
                        <img 
                          src={user.licenseImage} 
                          alt="License Document"
                          className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all"
                          onClick={() => window.open(user.licenseImage, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full transition-opacity">
                            Click to view full size
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* License Details */}
                  {user.licenseType && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {user.licenseType.replace('_', ' ')}
                      </span>
                    </div>
                  )}

                  {user.licenseNumber && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Number:</span>
                      <span className="font-mono font-medium text-gray-900 dark:text-white">
                        {user.licenseNumber}
                      </span>
                    </div>
                  )}

                  {/* Submission Date */}
                  {user.verificationSubmittedAt && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(user.verificationSubmittedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {user.onboardingStatus === 'rejected' && user.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-xs font-medium text-red-900 dark:text-red-400 mb-1">Rejection Reason:</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{user.rejectionReason}</p>
                    </div>
                  )}

                  {/* Approval Date */}
                  {user.onboardingStatus === 'approved' && user.verificationReviewedAt && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Approved on:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(user.verificationReviewedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ Provider: My Services */}
            {user?.role === 'provider' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiBriefcase className="w-4 h-4" />
                    My Services
                  </h3>
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Manage
                  </button>
                </div>
                {servicesLoading ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">Loading services…</div>
                ) : myServices.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">You haven't added any services yet. Click Manage to add your known services.</div>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {myServices.map(s => (
                      <li key={s._id} className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{s.category || 'General'} • Base ₹{s.price}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">

            {/* Service selection modal */}
            <ServiceSelectionModal
              isOpen={showServiceModal}
              onClose={() => setShowServiceModal(false)}
              onComplete={async () => {
                setShowServiceModal(false);
                // Refresh services list
                try {
                  setServicesLoading(true);
                  const self = await API.get('/users/me');
                  const prof = await API.get(`/providers/${self.data.user._id}/profile`);
                  setMyServices(prof.data?.services || []);
                } catch (e) {
                  console.warn('Failed to refresh services after update');
                } finally { setServicesLoading(false); }
              }}
            />
                  Full Name
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiUser className="text-gray-400 mr-3" />
                  <input
                    type="text"
                    className="bg-transparent flex-1 outline-none"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiPhone className="text-gray-400 mr-3" />
                  <input
                    type="tel"
                    className="bg-transparent flex-1 outline-none"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Address Search */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <PlacesAutocomplete
                  value={form.address}
                  onChange={(val) => setForm({ ...form, address: val })}
                  onSelect={async (val) => {
                    const results = await geocodeByAddress(val);
                    const latLng = await getLatLng(results[0]);
                    setForm({ ...form, address: val });
                    setPosition([latLng.lat, latLng.lng]);
                  }}
                >
                  {({ getInputProps, suggestions, getSuggestionItemProps }) => (
                    <div>
                      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                        <FiSearch className="text-gray-400 mr-3" />
                        <input
                          {...getInputProps({
                            placeholder: "Search your location...",
                            className:
                              "bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100",
                          })}
                        />
                      </div>
                      <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((s) => (
                          <div
                            {...getSuggestionItemProps(s, {
                              className:
                                "px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer text-sm",
                            })}
                            key={s.placeId}
                          >
                            {s.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </PlacesAutocomplete>

                {/* Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all disabled:opacity-60"
                  >
                    <FiNavigation />
                    {locating ? "Locating..." : "Locate Me"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapFull(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <FiMaximize2 />
                    Expand Map
                  </button>
                </div>

                {/* Inline Map */}
                {position && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-md">
                    <MapContainer
                      center={position}
                      zoom={lastZoom}
                      scrollWheelZoom={false}
                      style={{ height: "300px", width: "100%" }}
                      whenCreated={(map) =>
                        map.on("zoomend", () =>
                          setLastZoom(map.getZoom() || 15)
                        )
                      }
                    >
                      <TileLayer
                        url={
                          theme === "dark"
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        }
                      />
                      <MapAutoResize center={position} />
                      <LocationMarker
                        position={position}
                        setPosition={(pos) => {
                          setPosition(pos);
                          reverseGeocode(pos[0], pos[1]);
                        }}
                      />
                      <LiveLocationMarker livePosition={livePosition} />
                    </MapContainer>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center py-2">
                      Tap to move the marker. Address updates automatically.
                    </p>
                    {distance && (
                      <p className="text-[12px] text-center text-blue-600 dark:text-blue-400 pb-2">
                        📍 You’re {distance} away from your saved address
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Precise Address (Text Input for Remote Locations) */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Precise Address <span className="text-xs text-gray-500 dark:text-gray-400">(Optional - for remote areas)</span>
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiNavigation className="text-gray-400 mr-3" />
                  <input
                    type="text"
                    className="bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Near Old Temple, Village Road, Landmark details..."
                    value={form.preciseAddress}
                    onChange={(e) =>
                      setForm({ ...form, preciseAddress: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Add specific landmarks or directions for areas not accurately shown on the map
                </p>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow transition-all disabled:opacity-60"
                >
                  {saving && (
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <span className="text-[11px] text-gray-500 dark:text-gray-500">
                  Your data is private and secure.
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-4 flex items-center gap-2">
            <FiLock className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Change Password</h2>
          </div>

          <div className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {/* Old Password */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Current Password
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiLock className="text-gray-400 mr-3" />
                  <input
                    type="password"
                    className="bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100"
                    placeholder="Enter current password"
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  New Password
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiLock className="text-gray-400 mr-3" />
                  <input
                    type="password"
                    className="bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100"
                    placeholder="At least 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Confirm New Password
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
                  <FiLock className="text-gray-400 mr-3" />
                  <input
                    type="password"
                    className="bg-transparent flex-1 outline-none text-gray-900 dark:text-gray-100"
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingPassword && (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                  )}
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Password must be at least 6 characters long.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ✅ Fullscreen Map */}
      {showMapFull && position && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 w-[90%] h-[80%] rounded-2xl overflow-hidden shadow-2xl relative">
            <MapContainer
              center={position}
              zoom={lastZoom}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
              whenCreated={(map) =>
                map.on("zoomend", () => setLastZoom(map.getZoom() || 15))
              }
            >
              <TileLayer
                url={
                  theme === "dark"
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                }
              />
              <MapAutoResize center={position} />
              <LocationMarker
                position={position}
                setPosition={(pos) => {
                  setPosition(pos);
                  reverseGeocode(pos[0], pos[1]);
                }}
              />
              <LiveLocationMarker livePosition={livePosition} />
            </MapContainer>

            {/* Confirm Button */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                onClick={() => setShowMapFull(false)}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition"
              >
                <FiCheckCircle />
                Confirm & Close
              </button>
            </div>

            {/* Close X */}
            <button
              onClick={() => setShowMapFull(false)}
              className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
