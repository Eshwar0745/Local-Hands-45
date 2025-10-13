import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import TrackingMap from "../components/TrackingMap";

export default function CustomerTrackProvider() {
  const { providerId } = useParams(); // /customer/track/:providerId
  const [provider, setProvider] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");

  // Load provider coordinates periodically
  useEffect(() => {
    let interval;
    const fetchData = async () => {
      try {
        const { data } = await API.get(`/provider/track/${providerId}`);
        if (data.location?.coordinates) {
          setProvider({
            lat: data.location.coordinates[1],
            lng: data.location.coordinates[0],
          });
        }
      } catch (e) {
        setError("Unable to fetch provider location");
      }
    };
    fetchData();
    interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [providerId]);

  // Optionally load customer's own coordinates once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCustomer({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => {}
      );
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Track Provider</h2>

      {error && (
        <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>
      )}

      <TrackingMap provider={provider} customer={customer} />

      <div className="mt-4 text-center text-gray-600 dark:text-gray-300">
        {provider
          ? `Provider last seen at (${provider.lat?.toFixed(4)}, ${provider.lng?.toFixed(4)})`
          : "Waiting for provider data..."}
      </div>
    </div>
  );
}
