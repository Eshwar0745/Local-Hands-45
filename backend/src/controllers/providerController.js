import User from "../models/User.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

/* ----------------------------------------------
 🧾 Provider Onboarding & Verification
---------------------------------------------- */
export const submitOnboarding = async (req, res) => {
  try {
    const { documents = [], selfie = "", otpVerified = false } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { documents, selfie, otpVerified },
      { new: true }
    ).select("-password");
    res.json({ user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const submitLicenseVerification = async (req, res) => {
  try {
    const { licenseImage, licenseType, licenseNumber } = req.body;

    if (!licenseImage) return res.status(400).json({ message: "License image is required" });
    if (!["aadhar", "pan", "driving_license", "other"].includes(licenseType))
      return res.status(400).json({ message: "Invalid license type" });

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        licenseImage,
        licenseType,
        licenseNumber,
        onboardingStatus: "pending",
        verificationSubmittedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    res.json({
      user,
      message: "License submitted successfully. Waiting for admin approval.",
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "onboardingStatus licenseImage licenseType verificationSubmittedAt rejectionReason"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      status: user.onboardingStatus,
      licenseImage: user.licenseImage,
      licenseType: user.licenseType,
      submittedAt: user.verificationSubmittedAt,
      rejectionReason: user.rejectionReason,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ----------------------------------------------
 ⚙️ Availability & Go Live
---------------------------------------------- */
export const setAvailability = async (req, res) => {
  try {
    const { isAvailable, lng, lat } = req.body;

    // ✅ Only approved providers can go live
    if (isAvailable) {
      const provider = await User.findById(req.userId).select("onboardingStatus role");
      if (provider.role === "provider" && provider.onboardingStatus !== "approved") {
        return res.status(403).json({ message: "You need admin approval to go live" });
      }
    }

    // ✅ Don’t allow live toggle if active booking
    const activeBooking = await Booking.findOne({
      provider: req.userId,
      status: "in_progress",
    });
    if (isAvailable && activeBooking) {
      return res.status(400).json({
        message:
          "Cannot go live while you have an active service in progress. Complete current service first.",
        activeBooking: activeBooking.bookingId,
      });
    }

    const updateFields = {
      isAvailable: !!isAvailable,
      isLiveTracking: !!isAvailable,
      isOnline: !!isAvailable
    };

    // ✅ Capture location if provided
    if (isAvailable && typeof lng === "number" && typeof lat === "number") {
      updateFields.location = { type: "Point", coordinates: [lng, lat] };
      updateFields.locationUpdatedAt = new Date();
    }

    const user = await User.findByIdAndUpdate(req.userId, updateFields, { new: true }).select(
      "-password"
    );

    // ✅ When going offline, expire pending offers and auto reassign
    if (!isAvailable) {
      const providerId = new mongoose.Types.ObjectId(req.userId);
      const affected = await Booking.find({ status: "requested", "offers.provider": providerId });

      for (const b of affected) {
        const pending = b.offers.find(
          (o) => o.status === "pending" && o.provider.toString() === req.userId
        );
        if (pending) {
          pending.status = "expired";
          pending.respondedAt = new Date();

          // try to assign next available provider
          while (b.pendingProviders && b.pendingProviders.length > 0) {
            const nextId = b.pendingProviders.shift();
            const np = await User.findById(nextId).select("isAvailable");
            if (np && np.isAvailable) {
              b.offers.push({ provider: nextId, status: "pending", offeredAt: new Date() });
              b.providerResponseTimeout = new Date(Date.now() + 10 * 1000);
              break;
            }
          }

          if (!b.offers.find((o) => o.status === "pending")) {
            b.providerResponseTimeout = undefined;
            b.autoAssignMessage = "No live providers currently available.";
          }
          await b.save();
        }
      }
    }

    res.json({ user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ----------------------------------------------
 📍 Live Location + Booking Sync
---------------------------------------------- */
export const updateLocation = async (req, res) => {
  try {
    const { lng, lat, bookingId, customerId } = req.body;
    if (typeof lng !== "number" || typeof lat !== "number") {
      return res.status(400).json({ message: "lng/lat must be numeric" });
    }

    // Update provider location
    const updateFields = {
      location: { type: "Point", coordinates: [lng, lat] },
      locationUpdatedAt: new Date(),
      isOnline: true,
      isLiveTracking: true
    };

    const provider = await User.findByIdAndUpdate(
      req.userId,
      updateFields,
      { new: true }
    ).select("-password");

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    // Calculate distance from customer if customerId provided
    let distanceFromCustomer;
    if (customerId) {
      const customer = await User.findById(customerId).select("location");
      if (customer?.location?.coordinates?.length === 2) {
        const [clng, clat] = customer.location.coordinates;
        const R = 6371; // km
        const dLat = ((clat - lat) * Math.PI) / 180;
        const dLng = ((clng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((clat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromCustomer = Number((R * c).toFixed(2));
      }
    }

    // Update booking location and emit socket update if booking exists
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.status === "in_progress") {
        // Update booking location
        booking.providerLocation = { type: "Point", coordinates: [lng, lat] };
        booking.providerLastUpdate = provider.locationUpdatedAt;

        // Calculate distance from booking location (provider -> customer)
        if (booking.location?.coordinates?.length === 2) {
          const [blng, blat] = booking.location.coordinates;
          const R = 6371; // km
          const dLat = ((blat - lat) * Math.PI) / 180;
          const dLng = ((blng - lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat * Math.PI) / 180) * 
              Math.cos((blat * Math.PI) / 180) * 
              Math.sin(dLng / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          // Persist on canonical field used by getTrackingStatus
          booking.distanceFromCustomer = Number((R * c).toFixed(2));
        }
        await booking.save();

        // Emit location update via socket
        if (req.app.get('io')) {
          req.app.get('io').to(booking.customer.toString()).emit('provider:location', {
            lat,
            lng,
            bookingId,
            updatedAt: provider.locationUpdatedAt,
            distanceFromBooking: booking.distanceFromProvider
          });
        }
      }
    }

    res.json({
      success: true,
      provider,
      distanceFromCustomer,
      bookingDistance: booking?.distanceFromCustomer
    });
  } catch (e) {
    console.error('Location update error:', e);
    res.status(500).json({ message: e.message });
  }
};

export const getProviderLocation = async (req, res) => {
  try {
    const provider = await User.findById(req.params.id).select(
      "location distanceFromCustomer lastLocationUpdate"
    );
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ----------------------------------------------
 🔍 Nearby Providers
---------------------------------------------- */
export const nearbyProviders = async (req, res) => {
  try {
    const { lng, lat, radiusKm = 3 } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: "lng & lat are required" });

    const meters = Number(radiusKm) * 1000;
    const providers = await User.find({
      role: "provider",
      isAvailable: true,
      onboardingStatus: "approved",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          $maxDistance: meters,
        },
      },
    }).select("name rating location distanceFromCustomer");

    res.json({ count: providers.length, providers });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* ----------------------------------------------
 ✅ New: Provider Status (used by frontend)
---------------------------------------------- */
export const getProviderStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("isAvailable");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ isOnline: !!user.isAvailable });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
