import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    password: { type: String },
    phone: { type: String, unique: true, sparse: true },
    googleId: { type: String },
    role: { type: String, enum: ["customer", "provider", "admin", null], default: null },
    verified: { type: Boolean, default: false },

    // -----------------------
    // 📍 Provider Live Tracking
    // -----------------------
    isAvailable: { type: Boolean, default: false },
    isLiveTracking: { type: Boolean, default: false }, // actively sending updates
    liveTrackingSessionId: { type: String }, // optional session ID to differentiate jobs

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // Real-time tracking fields
    lastUpdatedAt: { type: Date, default: Date.now }, // when location last updated
    currentJobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" }, // active job reference
    distanceFromCustomer: { type: Number, default: 0 }, // dynamically updated (in km)

    // Radius control for job matching
    trackingRadius: { type: Number, default: 5 }, // 3,5,7,10 km

    // -----------------------
    // 📦 Provider History
    // -----------------------
    lastServiceLocation: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    lastServiceCompletedAt: { type: Date },
    completedJobs: { type: Number, default: 0 },

    // -----------------------
    // 🧾 Verification System
    // -----------------------
    documents: [{ type: String }],
    selfie: { type: String },
    otpVerified: { type: Boolean, default: false },
    onboardingStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    licenseImage: { type: String },
    licenseType: { type: String, enum: ["aadhar", "pan", "driving_license", "other"] },
    licenseNumber: { type: String },
    verificationSubmittedAt: { type: Date },
    verificationReviewedAt: { type: Date },
    verificationReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },

    // -----------------------
    // 🌟 Ratings & Reviews
    // -----------------------
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // -----------------------
    // 🏠 Customer Info
    // -----------------------
    address: { type: String },
    preciseAddress: { type: String },

    // -----------------------
    // 🔐 Security & OTP
    // -----------------------
    passwordResetOtp: { type: String },
    passwordResetExpires: { type: Date },
    phoneOtp: { type: String },
    phoneOtpExpires: { type: Date },
  },
  { timestamps: true }
);

// ---------------------------
// 🗺️ Geo Indexes & Helpers
// ---------------------------
userSchema.index({ location: "2dsphere" });
userSchema.index({ rating: -1 });
userSchema.index({ completedJobs: -1 });

// ---------------------------
// 📏 Utility Function - Distance Calculation
// ---------------------------
userSchema.methods.getDistanceFromCustomer = function (customerLocation) {
  if (!customerLocation?.coordinates || !this.location?.coordinates) return null;

  const [lng1, lat1] = this.location.coordinates;
  const [lng2, lat2] = customerLocation.coordinates;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in kilometers
};

const User = mongoose.model("User", userSchema);
export default User;
