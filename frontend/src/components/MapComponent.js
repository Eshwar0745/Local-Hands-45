import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ customer, provider }) {
	const map = useMap();
	React.useEffect(() => {
		if (customer && provider) {
			const bounds = [customer, provider];
			map.fitBounds(bounds, { padding: [30, 30] });
		} else if (customer) {
			map.setView(customer, 14);
		} else if (provider) {
			map.setView(provider, 14);
		}
	}, [customer?.[0], customer?.[1], provider?.[0], provider?.[1]]);
	return null;
}

export default function MapComponent({ customer, provider, distanceKm, etaMinutes, stale }) {
	const center = useMemo(() => customer || provider || [12.9716, 77.5946], [customer, provider]);
	const linePositions = customer && provider ? [customer, provider] : null;

	return (
		<div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
			<MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<FitBounds customer={customer} provider={provider} />

				{customer && (
					<CircleMarker center={customer} radius={10} pathOptions={{ color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.7 }} />
				)}
				{provider && (
					<CircleMarker center={provider} radius={10} pathOptions={{ color: stale ? '#F59E0B' : '#10B981', fillColor: stale ? '#FCD34D' : '#34D399', fillOpacity: 0.7 }} />
				)}
				{linePositions && (
					<Polyline positions={linePositions} pathOptions={{ color: '#64748B', weight: 3, dashArray: '6 6' }} />
				)}
			</MapContainer>

			{(distanceKm != null || etaMinutes != null) && (
				<div className="absolute mt-2 ml-2 px-3 py-2 text-xs bg-white/90 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
					{distanceKm != null && <div><span className="font-medium">Distance:</span> {distanceKm.toFixed(2)} km</div>}
					{etaMinutes != null && <div><span className="font-medium">ETA:</span> ~{etaMinutes} min</div>}
					{provider && <div className="mt-1 text-[10px] text-gray-500">Provider {stale ? '(last update >30s)' : '(live)'}</div>}
				</div>
			)}
		</div>
	);
}

