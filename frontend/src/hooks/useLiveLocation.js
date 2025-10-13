import { useEffect } from "react";
import API from "../services/api";

/**
 * useLiveLocation
 * - Watches GPS when provider is live.
 * - Sends updates to backend periodically.
 */
export default function useLiveLocation({ isActive, bookingId, customerId }) {
  useEffect(() => {
    if (!isActive || !navigator.geolocation) return;

    let watchId;
    let interval;

    const sendLocation = async (coords) => {
      try {
        await API.post("/providers/update-location", {
          lng: coords.longitude,
          lat: coords.latitude,
          bookingId,
          customerId,
        });
      } catch (err) {
        console.warn("Location update failed:", err?.response?.data || err.message);
      }
    };

    // Start watching GPS
    watchId = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords),
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true }
    );

    // Fallback interval update (every 30 s)
    interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords),
        () => {}
      );
    }, 30000);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (interval) clearInterval(interval);
    };
  }, [isActive, bookingId, customerId]);
}
