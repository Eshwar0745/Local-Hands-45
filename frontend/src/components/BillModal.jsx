import React, { useState } from 'react';
import { FiX, FiCreditCard, FiDollarSign, FiCheck, FiSend } from 'react-icons/fi';
import { loadRazorpayScript, createRazorpayOrder } from '../services/paymentAPI';
import MockPaymentGateway from './MockPaymentGateway';
import API from '../services/api';
import './BillModal.css';

const BillModal = ({ booking, onClose, onPaymentSuccess, userRole }) => {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [sendingBill, setSendingBill] = useState(false);
  const [message, setMessage] = useState('');
  const [showMockPayment, setShowMockPayment] = useState(false);

  if (!booking || !booking.billDetails) {
    return null;
  }

  const { billDetails } = booking;
  const isPaid = booking.paymentStatus === 'paid';
  const isBilled = booking.paymentStatus === 'billed';
  const isProvider = userRole === 'provider';
  const isCustomer = userRole === 'customer';

  // Provider sends bill to customer
  const handleSendBill = async () => {
    try {
      setSendingBill(true);
      setMessage('');
      await API.post(`/billing/${booking._id}/send-bill`);
      setMessage('✅ Bill sent to customer successfully!');
      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
      }, 1500);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Failed to send bill');
    } finally {
      setSendingBill(false);
    }
  };

  // Customer pays with cash
  const handleCashPayment = async () => {
    if (!window.confirm('Confirm payment with cash?')) return;
    
    try {
      setPaymentLoading(true);
      setMessage('');
      await API.post(`/billing/${booking._id}/mark-cash-paid`);
      setMessage('✅ Payment marked as completed!');
      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      setMessage(error?.response?.data?.message || 'Failed to process cash payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Customer pays with Razorpay
  const handleRazorpayPayment = () => {
    const amount = Number(billDetails?.total || 0);
    if (!amount || amount <= 0) {
      setMessage('❌ Bill amount invalid or not generated');
      return;
    }
    setShowMockPayment(true);
  };

  return (
    <>
      <div className="bill-modal-overlay" onClick={onClose}>
        <div className="bill-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="bill-modal-header">
            <h2>📋 Service Bill</h2>
            <button className="close-btn" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className="bill-modal-body">
            {/* Booking Info */}
            <div className="bill-info-section">
              <div className="info-row">
                <span className="label">Booking ID:</span>
                <span className="value">{booking.bookingId}</span>
              </div>
              <div className="info-row">
                <span className="label">Service:</span>
                <span className="value">{booking.serviceCatalog?.name || booking.service?.name || 'Service'}</span>
              </div>
              <div className="info-row">
                <span className="label">Completed On:</span>
                <span className="value">{new Date(booking.completedAt).toLocaleString()}</span>
              </div>
              {isCustomer && booking.provider && (
                <div className="info-row">
                  <span className="label">Provider:</span>
                  <span className="value">{booking.provider.name}</span>
                </div>
              )}
              {isProvider && booking.customer && (
                <div className="info-row">
                  <span className="label">Customer:</span>
                  <span className="value">{booking.customer.name}</span>
                </div>
              )}
            </div>

            {/* Bill Breakdown */}
            <div className="bill-breakdown">
              <h3>Bill Details</h3>
              <div className="line-item">
                <span>Service Charges</span>
                <span>₹{billDetails.serviceCharges}</span>
              </div>
              {billDetails.extraFees > 0 && (
                <div className="line-item">
                  <span>Extra Fees/Visit Charge</span>
                  <span>₹{billDetails.extraFees}</span>
                </div>
              )}
              {billDetails.discount > 0 && (
                <div className="line-item discount">
                  <span>Discount</span>
                  <span>-₹{billDetails.discount}</span>
                </div>
              )}
              {billDetails.tax > 0 && (
                <div className="line-item">
                  <span>Tax ({billDetails.tax}%)</span>
                  <span>₹{((billDetails.subtotal * billDetails.tax) / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="line-item subtotal">
                <span>Subtotal</span>
                <span>₹{billDetails.subtotal}</span>
              </div>
              <div className="line-item total">
                <span><strong>Total Amount</strong></span>
                <span><strong>₹{billDetails.total}</strong></span>
              </div>
            </div>

            {billDetails.notes && (
              <div className="bill-notes">
                <strong>Notes:</strong> {billDetails.notes}
              </div>
            )}

            {/* Payment Status */}
            <div className={`payment-status ${isPaid ? 'paid' : 'pending'}`}>
              {isPaid ? (
                <>
                  <FiCheck className="status-icon" />
                  <span>Payment Completed</span>
                  {booking.paymentMethod && (
                    <span className="payment-method">via {booking.paymentMethod.toUpperCase()}</span>
                  )}
                </>
              ) : (
                <>
                  <FiDollarSign className="status-icon" />
                  <span>Payment Pending</span>
                </>
              )}
            </div>

            {/* Messages */}
            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bill-modal-footer">
            {isProvider && !isPaid && (
              <button
                className="btn-send-bill"
                onClick={handleSendBill}
                disabled={sendingBill || booking.billSentAt}
              >
                <FiSend />
                {booking.billSentAt ? 'Bill Sent' : 'Send Bill to Customer'}
              </button>
            )}

            {isCustomer && isBilled && !isPaid && (
              <div className="payment-buttons">
                <button
                  className="btn-pay-cash"
                  onClick={handleCashPayment}
                  disabled={paymentLoading}
                >
                  <FiDollarSign />
                  Pay with Cash
                </button>
                <button
                  className="btn-pay-razorpay"
                  onClick={handleRazorpayPayment}
                  disabled={paymentLoading}
                >
                  <FiCreditCard />
                  Pay Online
                </button>
              </div>
            )}

            {isCustomer && !isBilled && (
              <div className="info-message">
                Waiting for provider to send the bill...
              </div>
            )}
          </div>
        </div>
      </div>

      {showMockPayment && (
        <MockPaymentGateway
          bookingId={booking._id}
          amount={Number(billDetails?.total || 0)}
          serviceName={booking.serviceCatalog?.name || booking.service?.name || 'Service'}
          customerInfo={booking.customer}
          onPaymentSuccess={(updatedBooking) => {
            setShowMockPayment(false);
            if (onPaymentSuccess) onPaymentSuccess(updatedBooking);
            onClose();
          }}
          onClose={() => setShowMockPayment(false)}
        />
      )}
    </>
  );
};

export default BillModal;
