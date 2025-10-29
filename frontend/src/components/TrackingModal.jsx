import React, { useState, useEffect } from 'react';
import './TrackingModal.css';
import API from '../services/api';
import TrackingMap from './TrackingMap';

const TrackingModal = ({ booking, trackingData, onClose }) => {
  const [provider, setProvider] = useState(
    trackingData?.provider ? { lat: trackingData.provider.lat, lng: trackingData.provider.lng } : null
  );
  const [customer, setCustomer] = useState(
    trackingData?.customer ? { lat: trackingData.customer.lat, lng: trackingData.customer.lng } : null
  );
  const [eta, setEta] = useState(
    typeof trackingData?.etaMinutes === 'number' ? `${trackingData.etaMinutes} min` : 'Calculating...'
  );
  const [distanceKm, setDistanceKm] = useState(
    typeof trackingData?.distanceKm === 'number' ? trackingData.distanceKm : null
  );

  useEffect(() => {
    if (!booking?._id) return;

    const fetchTracking = async () => {
      try {
        const { data } = await API.get(`/bookings/${booking._id}/tracking`);
        if (data) {
          if (data.provider?.lat && data.provider?.lng) {
            setProvider({ lat: data.provider.lat, lng: data.provider.lng });
          }
          if (data.customer?.lat && data.customer?.lng) {
            setCustomer({ lat: data.customer.lat, lng: data.customer.lng });
          }
          setEta(typeof data.etaMinutes === 'number' ? `${data.etaMinutes} min` : 'Calculating...');
          setDistanceKm(typeof data.distanceKm === 'number' ? data.distanceKm : null);
        }
      } catch (error) {
        console.error('Failed to fetch tracking data:', error);
      }
    };

    // Immediate fetch, then poll
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, [booking]);
 
  const getGoogleMapsUrl = () => {
    if (provider?.lat && provider?.lng) {
      return `https://www.google.com/maps?q=${provider.lat},${provider.lng}`;
    }
    return '#';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Track Provider</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-content">
          <div className="provider-info">
            <h3>{booking.provider?.name || 'Provider'}</h3>
            <p className="service-name">{booking.service?.name}</p>
            <p className="booking-status">
              Status: <span className={`status-${booking.status}`}>{booking.status.replace('_', ' ').toUpperCase()}</span>
            </p>
          </div>

          <div className="tracking-info">
            <div className="info-card">
              <span className="icon">🕐</span>
              <div>
                <p className="label">Estimated Arrival</p>
                <p className="value">{eta}</p>
              </div>
            </div>

            <div className="info-card">
              <span className="icon">📍</span>
              <div>
                <p className="label">Current Location</p>
                <p className="value">
                  {provider?.lat && provider?.lng
                    ? `${provider.lat.toFixed(4)}, ${provider.lng.toFixed(4)}`
                    : 'Location updating...'}
                </p>
              </div>
            </div>

            {typeof distanceKm === 'number' && (
              <div className="info-card">
                <span className="icon">🚗</span>
                <div>
                  <p className="label">Distance</p>
                  <p className="value">{distanceKm.toFixed(2)} km</p>
                </div>
              </div>
            )}

            {booking.scheduledFor && (
              <div className="info-card">
                <span className="icon">📅</span>
                <div>
                  <p className="label">Scheduled For</p>
                  <p className="value">{new Date(booking.scheduledFor).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          <div className="map-section">
            <TrackingMap 
              provider={provider} 
              customer={customer} 
              providerLabel={booking?.provider?.name ? `${booking.provider.name} (start)` : 'Provider (start)'}
              customerLabel={'Customer (destination)'}
            />
            {provider?.lat && provider?.lng && (
              <div className="text-center mt-2">
                <a href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer" className="view-in-maps-btn">View in Google Maps</a>
              </div>
            )}
          </div>

          <div className="contact-section">
            <p className="contact-label">Need to contact the provider?</p>
            <div className="contact-buttons">
              {booking.provider?.phone && (
                <a href={`tel:${booking.provider.phone}`} className="btn-contact call">
                  📞 Call
                </a>
              )}
              {booking.provider?.phone && (
                <a 
                  href={`https://wa.me/${booking.provider.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-contact whatsapp"
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-close">Close</button>
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;
