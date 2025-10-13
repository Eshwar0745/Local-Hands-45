import React, { useEffect, useState } from "react";
import API from "../services/api";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Configure default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 14, { animate: true });
  }, [lat, lng]);
  return null;
}

export default function NearbyProvidersMap() {
  const [userLoc, setUserLoc] = useState(null);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState("");

  // Step 1: Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setError("Failed to get location: " + err.message);
      }
    );
  }, []);

  // Step 2: Fetch nearby providers every 10 seconds
  useEffect(() => {
    if (!userLoc) return;

    const fetchProviders = async () => {
      try {
        const { data } = await API.get("/providers/nearby", {
          params: {
            lng: userLoc.lng,
            lat: userLoc.lat,
            radiusKm: 3, // adjustable radius
          },
        });
        setProviders(data.providers || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load nearby providers");
      }
    };

    fetchProviders();
    const interval = setInterval(fetchProviders, 10000);
    return () => clearInterval(interval);
  }, [userLoc]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-brand-gray-900 dark:text-white">
        Nearby Providers
      </h1>
      {error && (
        <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{error}</p>
      )}

      {!userLoc ? (
        <p className="text-gray-600">Fetching your location...</p>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 h-[450px]">
          <MapContainer
            center={[userLoc.lat, userLoc.lng]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            />

            {/* Customer marker */}
            <Marker
              position={[userLoc.lat, userLoc.lng]}
              icon={
                new L.Icon({
                  iconUrl:
                    "https://cdn-icons-png.flaticon.com/512/64/64113.png",
                  iconSize: [32, 32],
                  iconAnchor: [16, 32],
                })
              }
            >
              <Popup>You are here</Popup>
            </Marker>

            {/* Provider markers */}
            {providers.map((p, i) => {
              const [lng, lat] = p.location.coordinates;
              return (
                <Marker
                  key={i}
                  position={[lat, lng]}
                  icon={
                    new L.Icon({
                      iconUrl:
                        "https://cdn-icons-png.flaticon.com/512/149/149060.png",
                      iconSize: [30, 30],
                      iconAnchor: [15, 30],
                    })
                  }
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{p.name}</strong>
                      <br />
                      ⭐ {p.rating || 0}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <RecenterMap lat={userLoc.lat} lng={userLoc.lng} />
          </MapContainer>
        </div>
      )}

      <div className="mt-4 text-gray-600 dark:text-gray-300">
        {providers.length > 0
          ? `${providers.length} provider(s) active nearby`
          : "No live providers found around you yet."}
      </div>
    </div>
  );
}
