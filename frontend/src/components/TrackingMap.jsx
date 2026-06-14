import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
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

export default function TrackingMap({ provider, customer, providerLabel = 'Provider', customerLabel = 'Customer' }) {
  if (!provider && !customer)
    return <p className="text-center">Waiting for location updates…</p>;

  // Helper to validate lat/lng
  const isValid = (lat, lng) => typeof lat === 'number' && typeof lng === 'number' && lat <= 90 && lat >= -90 && lng <= 180 && lng >= -180 && !(lat === 0 && lng === 0);

  const providerLat = provider?.lat ?? provider?.coordinates?.[1];
  const providerLng = provider?.lng ?? provider?.coordinates?.[0];
  const customerLat = customer?.lat ?? customer?.coordinates?.[1];
  const customerLng = customer?.lng ?? customer?.coordinates?.[0];

  const hasProvider = isValid(providerLat, providerLng);
  const hasCustomer = isValid(customerLat, customerLng);

  const initialCenter = hasProvider
    ? [providerLat, providerLng]
    : hasCustomer
    ? [customerLat, customerLng]
    : null;

  function FitBoundsOnce({ a, b }) {
    const map = useMap();
    useEffect(() => {
      if (a && b) {
        const bounds = L.latLngBounds(a, b);
        map.fitBounds(bounds, { padding: [40, 40], animate: true });
      }
    }, [a?.[0], a?.[1], b?.[0], b?.[1]]);
    return null;
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200 h-[420px]">
      {initialCenter ? (
        <MapContainer
          center={initialCenter}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
        <style>{`
          @keyframes route-marching-ants {
            to {
              stroke-dashoffset: -20;
            }
          }
          .animated-route {
            stroke-dasharray: 10, 10;
            animation: route-marching-ants 1.2s linear infinite;
          }
        `}</style>

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Provider marker */}
        {hasProvider && (
          <Marker 
            position={[providerLat, providerLng]}
            icon={
              new L.Icon({
                iconUrl: "https://img.icons8.com/color/48/worker-male.png",
                iconSize: [36, 36],
                iconAnchor: [18, 36],
              })
            }
          >
            <Popup>{providerLabel}</Popup>
          </Marker>
        )}

        {/* Customer marker */}
        {hasCustomer && (
          <Marker
            position={[customerLat, customerLng]}
            icon={
              new L.Icon({
                iconUrl: "https://img.icons8.com/color/48/home.png",
                iconSize: [36, 36],
                iconAnchor: [18, 36],
              })
            }
          >
            <Popup>{customerLabel}</Popup>
          </Marker>
        )}

        {/* Draw a simple route line between provider and customer if both known */}
        {hasProvider && hasCustomer && (
          <>
            <Polyline
              positions={[
                [providerLat, providerLng],
                [customerLat, customerLng]
              ]}
              pathOptions={{ 
                color: '#2563eb', 
                weight: 5, 
                opacity: 0.85,
                className: 'animated-route'
              }}
            />
            <FitBoundsOnce a={[providerLat, providerLng]} b={[customerLat, customerLng]} />
          </>
        )}

        {/* Keep the map following the provider while they move */}
        <Recenter lat={providerLat} lng={providerLng} />
      </MapContainer>
      ) : (
        <div className="h-[420px] flex items-center justify-center text-gray-500">
          Waiting for provider location…
        </div>
      )}
    </div>
  );
}
