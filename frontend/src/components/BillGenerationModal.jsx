import React, { useState } from 'react';
import axios from 'axios';
import './BillGenerationModal.css';

const BillGenerationModal = ({ booking, onClose, onBillGenerated }) => {
  // ✅ Auto-fill from questionnaire estimate if available
  const estimate = booking?.serviceDetails?.estimate;
  const [formData, setFormData] = useState({
    serviceCharges: estimate?.serviceCharge || estimate?.total || '',
    extraFees: 0,
    discount: 0,
    tax: 18, // Default 18% GST
    notes: estimate?.breakdown?.serviceName ? `Service: ${estimate.breakdown.serviceName}` : ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate totals
  const subtotal = (parseFloat(formData.serviceCharges) || 0) + 
                   (parseFloat(formData.extraFees) || 0) - 
                   (parseFloat(formData.discount) || 0);
  const taxAmount = (subtotal * (parseFloat(formData.tax) || 0)) / 100;
  const total = subtotal + taxAmount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.serviceCharges || parseFloat(formData.serviceCharges) <= 0) {
      setError('Service charges must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Normalize token key to match app-wide convention
      const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/billing/${booking._id}/generate-bill`,
        {
          serviceCharges: parseFloat(formData.serviceCharges),
          extraFees: parseFloat(formData.extraFees) || 0,
          discount: parseFloat(formData.discount) || 0,
          tax: parseFloat(formData.tax) || 0,
          notes: formData.notes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Bill generated successfully! Customer has been notified.');
        onBillGenerated && onBillGenerated(response.data.booking);
        onClose();
      }
    } catch (err) {
      console.error('Generate bill error:', err);
      setError(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bill-generation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Bill</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="booking-info">
            <p><strong>Booking ID:</strong> {booking.bookingId}</p>
            <p><strong>Customer:</strong> {booking.customer?.name || 'N/A'}</p>
            <p><strong>Service:</strong> {booking.serviceCatalog?.name || 'N/A'}</p>
            
            {/* ✅ Show questionnaire estimate if available */}
            {estimate && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #0284c7' }}>
                <p style={{ fontWeight: 'bold', color: '#0284c7', marginBottom: '5px' }}>📋 Questionnaire Estimate:</p>
                {estimate.breakdown?.answers && Object.entries(estimate.breakdown.answers).map(([key, value]) => (
                  <p key={key} style={{ fontSize: '12px', margin: '2px 0' }}>
                    <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                  </p>
                ))}
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a', marginTop: '8px' }}>
                  Estimated Total: ₹{estimate.total}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Service Charges (₹) *</label>
              <input
                type="number"
                name="serviceCharges"
                value={formData.serviceCharges}
                onChange={handleChange}
                placeholder="Enter service charges"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Extra Fees (₹)</label>
              <input
                type="number"
                name="extraFees"
                value={formData.extraFees}
                onChange={handleChange}
                placeholder="Materials, travel, etc."
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Discount (₹)</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                placeholder="Any discount offered"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Tax (%)</label>
              <input
                type="number"
                name="tax"
                value={formData.tax}
                onChange={handleChange}
                placeholder="GST percentage"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes for the customer"
                rows="3"
              />
            </div>

            <div className="bill-summary">
              <h3>Bill Summary</h3>
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax ({formData.tax}%):</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span><strong>Total Amount:</strong></span>
                <span><strong>₹{total.toFixed(2)}</strong></span>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Generating...' : 'Generate Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BillGenerationModal;
