import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Default marker icons
import "leaflet/dist/leaflet.css";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Utility to update map view when coordinates change
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng]);
  return null;
}

export default function TrackingMap({ provider, customer }) {
  if (!provider) return <p className="text-center">Loading map...</p>;

  const providerLat = provider?.lat || provider?.coordinates?.[1];
  const providerLng = provider?.lng || provider?.coordinates?.[0];
  const customerLat = customer?.lat || customer?.coordinates?.[1];
  const customerLng = customer?.lng || customer?.coordinates?.[0];

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 h-[420px]">
      <MapContainer
        center={[providerLat || 0, providerLng || 0]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        />

        {/* Provider marker */}
        {providerLat && providerLng && (
          <Marker position={[providerLat, providerLng]}>
            <Popup>Provider is here</Popup>
          </Marker>
        )}

        {/* Customer marker */}
        {customerLat && customerLng && (
          <Marker
            position={[customerLat, customerLng]}
            icon={
              new L.Icon({
                iconUrl:
                  "https://cdn-icons-png.flaticon.com/512/64/64113.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32],
              })
            }
          >
            <Popup>Customer location</Popup>
          </Marker>
        )}

        <Recenter lat={providerLat} lng={providerLng} />
      </MapContainer>
    </div>
  );
}
