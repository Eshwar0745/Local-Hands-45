import React, { useState, useEffect } from 'react';
import API from '../services/api';
import BillViewModal from '../components/BillViewModal';
import CustomerPaymentHistory from '../components/CustomerPaymentHistory';
import TrackingModal from '../components/TrackingModal';
import './CustomerBookings.css';

const CustomerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, payments

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
  const response = await API.get('/bookings/mine');
  setBookings(response.data.bookings || []);
    } catch (err) {
      console.error('Fetch bookings error:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBill = (booking) => {
    setSelectedBooking(booking);
    setShowBillModal(true);
  };

  const handlePaymentComplete = () => {
    fetchBookings(); // Refresh bookings after payment
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await API.patch(`/bookings/${bookingId}/cancel`);
      alert('Booking cancelled successfully');
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const handleTrackProvider = async (booking) => {
    try {
      const response = await API.get(`/bookings/${booking._id}/tracking`);
      setTrackingData(response.data);
      setSelectedBooking(booking);
      setShowTrackingModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load tracking information');
    }
  };

  const getStatusBadge = (booking) => {
    if (booking.paymentStatus === 'paid') {
      return <span className="status-badge paid">✓ Paid</span>;
    }
    if (booking.paymentStatus === 'billed') {
      return <span className="status-badge pending-payment">⏳ Payment Pending</span>;
    }
    if (booking.status === 'completed') {
      return <span className="status-badge completed">Completed</span>;
    }
    if (booking.status === 'in_progress') {
      return <span className="status-badge in-progress">In Progress</span>;
    }
    if (booking.status === 'accepted') {
      return <span className="status-badge accepted">Accepted</span>;
    }
    return <span className="status-badge">{booking.status}</span>;
  };

  if (loading) {
    return <div className="customer-bookings-loading">Loading...</div>;
  }

  if (error) {
    return <div className="customer-bookings-error">{error}</div>;
  }

  const activeBookings = bookings.filter(b => 
    b.status !== 'completed' && b.status !== 'cancelled' && b.paymentStatus !== 'paid'
  );
  const completedBookings = bookings.filter(b => 
    b.status === 'completed' || b.paymentStatus === 'paid'
  );

  return (
    <div className="customer-bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <div className="tab-buttons">
          <button
            className={activeTab === 'bookings' ? 'active' : ''}
            onClick={() => setActiveTab('bookings')}
          >
            📋 My Bookings
          </button>
          <button
            className={activeTab === 'payments' ? 'active' : ''}
            onClick={() => setActiveTab('payments')}
          >
            💳 Payment History
          </button>
        </div>
      </div>

      {activeTab === 'bookings' && (
        <>
          {activeBookings.length > 0 && (
            <section className="bookings-section">
              <h2>Active Bookings</h2>
              <div className="bookings-grid">
                {activeBookings.map((booking) => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-header">
                      <span className="booking-id">{booking.bookingId}</span>
                      {getStatusBadge(booking)}
                    </div>
                    
                    <div className="booking-details">
                      <p><strong>Service:</strong> {booking.serviceCatalog?.name || 'N/A'}</p>
                      <p><strong>Provider:</strong> {booking.provider?.name || 'Not assigned yet'}</p>
                      {booking.provider?.phone && (
                        <p><strong>Phone:</strong> {booking.provider.phone}</p>
                      )}
                      <p><strong>Scheduled:</strong> {new Date(booking.scheduledDate).toLocaleString()}</p>
                      {booking.estimatedCost && (
                        <p><strong>Estimated Cost:</strong> ₹{booking.estimatedCost}</p>
                      )}
                    </div>

                    <div className="booking-actions">
                      {/* Show Track Provider button if provider is assigned and job is in progress */}
                      {booking.provider && booking.status === 'in_progress' && (
                        <button
                          onClick={() => handleTrackProvider(booking)}
                          className="btn-track"
                        >
                          📍 Track Provider
                        </button>
                      )}

                      {/* Show Cancel button if provider is not assigned yet */}
                      {!booking.provider && booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="btn-cancel-booking"
                        >
                          ❌ Cancel Booking
                        </button>
                      )}

                      {/* Show Cancel button for accepted but not started jobs */}
                      {booking.provider && booking.status === 'accepted' && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="btn-cancel-booking"
                        >
                          ❌ Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {completedBookings.length > 0 && (
            <section className="bookings-section">
              <h2>Completed Bookings</h2>
              <div className="bookings-grid">
                {completedBookings.map((booking) => (
                  <div key={booking._id} className="booking-card">
                    <div className="booking-header">
                      <span className="booking-id">{booking.bookingId}</span>
                      {getStatusBadge(booking)}
                    </div>
                    
                    <div className="booking-details">
                      <p><strong>Service:</strong> {booking.serviceCatalog?.name || 'N/A'}</p>
                      <p><strong>Provider:</strong> {booking.provider?.name || 'N/A'}</p>
                      <p><strong>Completed:</strong> {new Date(booking.completedAt || booking.updatedAt).toLocaleString()}</p>
                      
                      {booking.billDetails && (
                        <div className="bill-preview">
                          <p className="bill-amount">₹{booking.billDetails.total.toFixed(2)}</p>
                          {booking.paymentStatus === 'paid' ? (
                            <p className="paid-label">✓ Paid via {booking.paymentMethod === 'razorpay' ? 'Online' : 'Cash'}</p>
                          ) : (
                            <button
                              onClick={() => handleViewBill(booking)}
                              className="btn-pay-now"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {booking.billDetails && (
                      <button
                        onClick={() => handleViewBill(booking)}
                        className="btn-view-bill"
                      >
                        View Bill
                      </button>
                    )}

                    {!booking.billDetails && booking.status === 'completed' && (
                      <div className="awaiting-bill">
                        <p>⏳ Waiting for provider to generate bill</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {bookings.length === 0 && (
            <div className="no-bookings">
              <p>No bookings yet</p>
              <p className="subtitle">Book a service to get started!</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'payments' && (
        <CustomerPaymentHistory />
      )}

      {showBillModal && selectedBooking && (
        <BillViewModal
          booking={selectedBooking}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBooking(null);
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {showTrackingModal && selectedBooking && (
        <TrackingModal
          booking={selectedBooking}
          trackingData={trackingData}
          onClose={() => {
            setShowTrackingModal(false);
            setSelectedBooking(null);
            setTrackingData(null);
          }}
        />
      )}
    </div>
  );
};

export default CustomerBookings;
