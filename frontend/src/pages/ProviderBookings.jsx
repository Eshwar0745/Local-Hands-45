import React, { useState, useEffect } from 'react';
import API from '../services/api';
import BillGenerationModal from '../components/BillGenerationModal';
import ProviderEarningsDashboard from '../components/ProviderEarningsDashboard';
import TrackingModal from '../components/TrackingModal';
import './ProviderBookings.css';

const ProviderBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [activeTab, setActiveTab] = useState('earnings'); // earnings, bookings
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);

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

  const handleGenerateBill = (booking) => {
    setSelectedBooking(booking);
    setShowBillModal(true);
  };

  const handleBillGenerated = (updatedBooking) => {
    // Update the booking in the list
    setBookings(prev => 
      prev.map(b => b._id === updatedBooking._id ? updatedBooking : b)
    );
    fetchBookings(); // Refresh to get latest data
  };

  const handleMarkCompleted = async (bookingId) => {
    if (!window.confirm('Mark this booking as completed?')) return;

    try {
      await API.patch(`/bookings/${bookingId}/complete`);
      alert('Booking marked as completed!');
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark as completed');
    }
  };

  const handleTrackCustomer = async (booking) => {
    try {
      const { data } = await API.get(`/bookings/${booking._id}/tracking`);
      setTrackingData(data);
      setSelectedBooking(booking);
      setShowTrackingModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load tracking information');
    }
  };

  const getStatusBadge = (booking) => {
    if (booking.paymentStatus === 'paid') {
      return <span className="status-badge paid">Paid</span>;
    }
    if (booking.paymentStatus === 'billed') {
      return <span className="status-badge billed">Billed - Awaiting Payment</span>;
    }
    if (booking.status === 'completed') {
      return <span className="status-badge completed">Completed</span>;
    }
    if (booking.status === 'in_progress') {
      return <span className="status-badge in-progress">In Progress</span>;
    }
    return <span className="status-badge pending">{booking.status}</span>;
  };

  if (loading) {
    return <div className="provider-bookings-loading">Loading...</div>;
  }

  if (error) {
    return <div className="provider-bookings-error">{error}</div>;
  }

  const completedBookings = bookings.filter(b => b.status === 'completed');
  const activeBookings = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');

  return (
    <div className="provider-bookings-page">
      <div className="page-header">
        <h1>Provider Dashboard</h1>
        <div className="tab-buttons">
          <button
            className={activeTab === 'earnings' ? 'active' : ''}
            onClick={() => setActiveTab('earnings')}
          >
            💰 Earnings
          </button>
          <button
            className={activeTab === 'bookings' ? 'active' : ''}
            onClick={() => setActiveTab('bookings')}
          >
            📋 Bookings
          </button>
        </div>
      </div>

      {activeTab === 'earnings' && (
        <ProviderEarningsDashboard />
      )}

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
                      <p><strong>Customer:</strong> {booking.customer?.name || 'N/A'}</p>
                      <p><strong>Phone:</strong> {booking.customer?.phone || 'N/A'}</p>
                      <p><strong>Address:</strong> {booking.address || 'N/A'}</p>
                      <p><strong>Scheduled:</strong> {new Date(booking.scheduledDate).toLocaleString()}</p>
                      {booking.serviceDetails?.estimate?.total != null && (
                        <p><strong>Estimated:</strong> ₹{booking.serviceDetails.estimate.total}</p>
                      )}
                    </div>

                    {booking.status === 'in_progress' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTrackCustomer(booking)}
                          className="btn-track"
                        >
                          📍 Track Customer
                        </button>
                        <button
                          onClick={() => handleMarkCompleted(booking._id)}
                          className="btn-complete"
                        >
                          Mark as Completed
                        </button>
                      </div>
                    )}
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
                      <p><strong>Customer:</strong> {booking.customer?.name || 'N/A'}</p>
                      <p><strong>Completed:</strong> {new Date(booking.completedAt || booking.updatedAt).toLocaleString()}</p>
                      
                      {booking.billDetails && (
                        <div className="bill-info">
                          <p><strong>Bill Amount:</strong> ₹{booking.billDetails.total.toFixed(2)}</p>
                          {booking.paymentMethod && (
                            <p><strong>Payment Method:</strong> {booking.paymentMethod === 'razorpay' ? '💳 Online' : '💵 Cash'}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {!booking.billDetails && booking.paymentStatus !== 'billed' && booking.paymentStatus !== 'paid' && (
                      <button
                        onClick={() => handleGenerateBill(booking)}
                        className="btn-generate-bill"
                      >
                        Generate Bill
                      </button>
                    )}

                    {booking.paymentStatus === 'billed' && booking.paymentStatus !== 'paid' && (
                      <div className="awaiting-payment">
                        <p>⏳ Awaiting customer payment</p>
                        <p className="bill-amount">₹{booking.billDetails?.total.toFixed(2)}</p>
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
            </div>
          )}
        </>
      )}

      {showBillModal && selectedBooking && (
        <BillGenerationModal
          booking={selectedBooking}
          onClose={() => {
            setShowBillModal(false);
            setSelectedBooking(null);
          }}
          onBillGenerated={handleBillGenerated}
        />
      )}

      {showTrackingModal && selectedBooking && (
        <TrackingModal
          booking={selectedBooking}
          trackingData={trackingData}
          viewerRole="provider"
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

export default ProviderBookings;
