import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API from '../services/api';

// Default icon fix for Leaflet when bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * MapComponent
 * Props:
 *  - mode: 'provider' | 'customer'
 *  - enableRoute: boolean (draw line between provider & customer)
 *  - customerCoords: { lat, lng } optional override
 *  - providerCoords: { lat, lng } optional override
 *  - onLocationChange: fn({ lat,lng, accuracy, source }) when user drags their own marker
 *  - watch: boolean enable continuous geolocation watch
 *  - pollingMs: number (default 10000) to refresh provider location from server
 */
export default function MapComponent({
  mode = 'customer',
  enableRoute = true,
  customerCoords: customerCoordsProp,
  providerCoords: providerCoordsProp,
  onLocationChange,
  watch = true,
  pollingMs = 10000,
  draggableSelf = true,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const providerMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const watchIdRef = useRef(null);
  const [permissionError, setPermissionError] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [lastProviderUpdate, setLastProviderUpdate] = useState(null);
  const [selfRole, setSelfRole] = useState(mode);

  // Haversine distance in km (fallback if Leaflet distance not available yet)
  const haversineKm = useCallback((c1, c2) => {
    if(!c1 || !c2) return null;
    const R = 6371;
    const dLat = (c2.lat - c1.lat) * Math.PI/180;
    const dLng = (c2.lng - c1.lng) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(c1.lat*Math.PI/180)*Math.cos(c2.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }, []);

  const computeDistance = useCallback(()=>{
    const p = providerMarkerRef.current?.getLatLng();
    const c = customerMarkerRef.current?.getLatLng();
    if(!p || !c) return;
    // Prefer Leaflet built-in method
    const meters = p.distanceTo(c);
    const km = meters / 1000;
    setDistanceKm(Number(km.toFixed(3)));
  }, []);

  const updateRoute = useCallback(()=>{
    if(!enableRoute) return;
    const p = providerMarkerRef.current?.getLatLng();
    const c = customerMarkerRef.current?.getLatLng();
    if(!p || !c) return;
    if(routeLineRef.current){
      routeLineRef.current.setLatLngs([p,c]);
    } else if(mapInstanceRef.current){
      routeLineRef.current = L.polyline([p,c], { color: '#2563eb', weight: 4, opacity: 0.65 }).addTo(mapInstanceRef.current);
    }
    computeDistance();
  }, [enableRoute, computeDistance]);

  const setOrMoveMarker = (kind, coords, opts={}) => {
    if(!mapInstanceRef.current || !coords) return;
    const { lat, lng } = coords;
    const existing = kind==='provider' ? providerMarkerRef.current : customerMarkerRef.current;
    if(existing){
      existing.setLatLng([lat,lng]);
    } else {
      const marker = L.marker([lat,lng], { draggable: draggableSelf && ((kind==='provider' && selfRole==='provider') || (kind==='customer' && selfRole==='customer')), ...opts });
      marker.addTo(mapInstanceRef.current);
      marker.on('dragend', (e)=>{
        const ll = e.target.getLatLng();
        if(onLocationChange){
          onLocationChange({ lat: ll.lat, lng: ll.lng, accuracy: null, source: 'drag' });
        }
        if(kind==='provider') {
          API.post('/providers/update-location', { lng: ll.lng, lat: ll.lat }).catch(()=>{});
        }
        updateRoute();
      });
      if(kind==='provider') providerMarkerRef.current = marker; else customerMarkerRef.current = marker;
    }
    updateRoute();
  };

  // Initialize map
  useEffect(()=>{
    if(mapInstanceRef.current) return; // already inited
    mapInstanceRef.current = L.map(mapRef.current, { center: [0,0], zoom: 2, worldCopyJump: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);
  }, []);

  // Apply explicit coords from props if provided initially
  useEffect(()=>{
    if(customerCoordsProp) setOrMoveMarker('customer', customerCoordsProp);
  }, [customerCoordsProp]);
  useEffect(()=>{
    if(providerCoordsProp) setOrMoveMarker('provider', providerCoordsProp);
  }, [providerCoordsProp]);

  // Fit bounds when both markers exist
  useEffect(()=>{
    if(!mapInstanceRef.current) return;
    if(providerMarkerRef.current && customerMarkerRef.current){
      const g = L.featureGroup([providerMarkerRef.current, customerMarkerRef.current]);
      mapInstanceRef.current.fitBounds(g.getBounds().pad(0.35));
      computeDistance();
    }
  }, [distanceKm]);

  // Geolocation watch (self role marker) + error handling
  useEffect(()=>{
    if(!watch) return;
    if(!(navigator.geolocation)){
      setPermissionError('Geolocation not supported');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      const coords = { lat: latitude, lng: longitude };
      if(selfRole === 'provider') setOrMoveMarker('provider', coords);
      else setOrMoveMarker('customer', coords);
      if(onLocationChange){ onLocationChange({ ...coords, accuracy, source: 'watch' }); }
      if(selfRole === 'provider') {
        API.post('/providers/update-location', { lng: longitude, lat: latitude }).catch(()=>{});
        setLastProviderUpdate(Date.now());
      }
    }, err => {
      console.warn('[geo] permission/position error', err);
      setPermissionError(err.message || 'Permission denied');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
    return ()=> { if(watchIdRef.current && navigator.geolocation){ navigator.geolocation.clearWatch(watchIdRef.current); } };
  }, [selfRole, watch]);

  // Poll provider fresh location from backend (for customer viewing active job)
  useEffect(()=>{
    if(mode !== 'customer' || !pollingMs) return;
    const id = setInterval(async ()=>{
      try {
        // This would require an endpoint to fetch current provider location for active booking
        // Placeholder: could fetch booking detail then provider.location
      } catch{}
    }, pollingMs);
    return ()=> clearInterval(id);
  }, [mode, pollingMs]);

  // Recompute route when markers move
  useEffect(()=>{
    const int = setInterval(()=> updateRoute(), 2000);
    return ()=> clearInterval(int);
  }, [updateRoute]);

  return (
    <div className="w-full h-96 relative rounded-xl overflow-hidden shadow-card">
      <div ref={mapRef} className="absolute inset-0" />
      <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-700 space-y-1">
        <div><strong>Role:</strong> {selfRole}</div>
        {distanceKm != null && <div><strong>Dist:</strong> {distanceKm} km</div>}
        {permissionError && <div className="text-red-600">{permissionError}</div>}
        {lastProviderUpdate && <div className="text-[10px] text-gray-500">Last provider ping: {new Date(lastProviderUpdate).toLocaleTimeString()}</div>}
      </div>
    </div>
  );
}
