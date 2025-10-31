import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './BillViewModal.css';

// Accept either a full booking object or just a bookingId
const BillViewModal = ({ booking, bookingId, onClose, onPaymentComplete, onPaymentSuccess }) => {
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [razorpayKey, setRazorpayKey] = useState(process.env.REACT_APP_RAZORPAY_KEY_ID || '');

  // Normalize props: prefer explicit bookingId prop, else derive from booking
  const targetBookingId = useMemo(() => bookingId || booking?._id, [bookingId, booking]);

  useEffect(() => {
    if (!targetBookingId) return;
    fetchBillDetails(targetBookingId);
  }, [targetBookingId]);

  const fetchBillDetails = async (id) => {
    try {
      const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/billing/${id}/bill`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setBillData(response.data.booking);
      }
    } catch (err) {
      console.error('Fetch bill error:', err);
      setError(err.response?.data?.message || 'Failed to load bill');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    setPaying(true);
    setError('');

    try {
      // Fetch key from backend to ensure it matches the account used to create orders
      let keyToUse = process.env.REACT_APP_RAZORPAY_KEY_ID || '';
      try {
        const { data: cfg } = await axios.get(`${process.env.REACT_APP_API_URL}/payments/config`);
        if (cfg?.keyId) {
          keyToUse = cfg.keyId; // use immediately for this checkout
          setRazorpayKey(cfg.keyId); // update state for future
        }
      } catch (e) {
        // Non-fatal; fallback to env var
        console.warn('Could not fetch Razorpay key from backend, using env');
      }

      // Guard against invalid amount
      const amount = Number(billData?.billDetails?.total || 0);
      if (!amount || amount <= 0) {
        setError('Bill amount is invalid or not generated yet. Please contact the provider.');
        setPaying(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load Razorpay. Please try again.');
        setPaying(false);
        return;
      }
      // Try to create an order on the server for secure checkout
      let orderId = null;
      let orderAmountPaise = Math.round(amount * 100);
      try {
        const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
        const { data: orderRes } = await axios.post(
          `${process.env.REACT_APP_API_URL}/payments/create-order-for-booking/${targetBookingId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        orderId = orderRes?.order?.id || null;
        // Use server authoritative amount if available (already in paise)
        if (orderRes?.order?.amount) {
          orderAmountPaise = orderRes.order.amount;
        }
      } catch (e) {
        console.warn('Create order failed, falling back to client-only checkout');
      }

      const options = {
        key: keyToUse || razorpayKey || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderId ? undefined : orderAmountPaise, // when order present, let Razorpay derive amount
        currency: orderId ? undefined : 'INR',
        name: 'LocalHands',
        description: `Payment for ${billData.serviceName}`,
        order_id: orderId || undefined,
        handler: async function (response) {
          try {
            const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
            // If order was created, verify signature first
            if (response.razorpay_order_id && response.razorpay_signature) {
              const { data: verify } = await axios.post(
                `${process.env.REACT_APP_API_URL}/payments/verify`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (!verify?.valid) {
                alert('Payment signature verification failed');
                return;
              }
            }

            if (!response.razorpay_order_id) {
              throw new Error('Missing order_id in Razorpay response');
            }

            const verifyResponse = await axios.post(
              `${process.env.REACT_APP_API_URL}/billing/${targetBookingId}/mark-online-paid`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            if (verifyResponse.data.success) {
              alert('Payment successful!');
              // Support both old and new prop names
              if (onPaymentComplete) onPaymentComplete();
              if (onPaymentSuccess) onPaymentSuccess(verifyResponse.data.booking);
              onClose();
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError(err.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: billData.customer?.name || '',
          email: billData.customer?.email || '',
          contact: billData.customer?.phone || ''
        },
        theme: {
          color: '#4CAF50'
        }
      };

      // Debug: log the key and order context to help diagnose 400s
      try {
        console.debug('[Razorpay] Opening checkout', { key: options.key?.slice(0, 8) + '...', orderId: options.order_id, amountPaise: options.amount });
      } catch {}

      const razorpay = new window.Razorpay(options);

      // Attach failure listeners to surface precise reasons from Razorpay
      if (razorpay && typeof razorpay.on === 'function') {
        razorpay.on('payment.failed', function (resp) {
          console.error('[Razorpay] payment.failed', resp);
          const msg = resp?.error?.description || resp?.error?.reason || 'Payment failed';
          setError(msg);
        });
        // Some builds emit 'payment.error' or modal events
        razorpay.on('payment.error', function (resp) {
          console.error('[Razorpay] payment.error', resp);
          const msg = resp?.error?.description || 'Payment error';
          setError(msg);
        });
        razorpay.on('modal.failed', function (resp) {
          console.error('[Razorpay] modal.failed', resp);
        });
        razorpay.on('modal.closed', function () {
          console.info('[Razorpay] modal.closed');
        });
      }
      razorpay.open();
    } catch (err) {
      console.error('Razorpay payment error:', err);
      setError('Failed to initiate payment');
    } finally {
      setPaying(false);
    }
  };

  const handleCashPayment = async () => {
    if (!window.confirm('Have you paid the provider in cash?')) {
      return;
    }

    setPaying(true);
    setError('');

    try {
      const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/billing/${targetBookingId}/mark-cash-paid`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        alert('Cash payment confirmed!');
        if (onPaymentComplete) onPaymentComplete();
        if (onPaymentSuccess) onPaymentSuccess(response.data.booking);
        onClose();
      }
    } catch (err) {
      console.error('Cash payment error:', err);
      setError(err.response?.data?.message || 'Failed to confirm cash payment');
    } finally {
      setPaying(false);
    }
  };

  // If we have neither a booking object nor a bookingId, show a safe fallback instead of crashing
  if (!targetBookingId && loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content bill-view-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Preparing bill...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content bill-view-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading bill details...</div>
        </div>
      </div>
    );
  }

  if (error && !billData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content bill-view-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-message">{error}</div>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    );
  }

  const bill = billData?.billDetails;
  const isPaid = billData?.paymentStatus === 'paid';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bill-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bill Details</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="bill-header">
            <div className="bill-info">
              <h3>LocalHands</h3>
              <p><strong>Booking ID:</strong> {billData.bookingId}</p>
              <p><strong>Service:</strong> {billData.serviceName}</p>
              <p><strong>Provider:</strong> {billData.provider?.name}</p>
              <p><strong>Date:</strong> {new Date(bill.generatedAt).toLocaleDateString()}</p>
            </div>
            {isPaid && (
              <div className="paid-stamp">
                <span>PAID</span>
              </div>
            )}
          </div>

          <div className="bill-items">
            <h4>Charges</h4>
            <div className="bill-row">
              <span>Service Charges</span>
              <span>₹{bill.serviceCharges.toFixed(2)}</span>
            </div>
            {bill.extraFees > 0 && (
              <div className="bill-row">
                <span>Extra Fees</span>
                <span>₹{bill.extraFees.toFixed(2)}</span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="bill-row discount">
                <span>Discount</span>
                <span>- ₹{bill.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="bill-row subtotal">
              <span>Subtotal</span>
              <span>₹{bill.subtotal.toFixed(2)}</span>
            </div>
            <div className="bill-row">
              <span>Tax ({bill.tax}%)</span>
              <span>₹{((bill.subtotal * bill.tax) / 100).toFixed(2)}</span>
            </div>
            <div className="bill-row total">
              <span><strong>Total Amount</strong></span>
              <span><strong>₹{bill.total.toFixed(2)}</strong></span>
            </div>
          </div>

          {bill.notes && (
            <div className="bill-notes">
              <h4>Notes</h4>
              <p>{bill.notes}</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {!isPaid && !paymentMethod && (
            <div className="payment-section">
              <h4>Select Payment Method</h4>
              <div className="payment-buttons">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={paying}
                  className="btn-razorpay"
                >
                  {paying ? 'Processing...' : 'Pay Online (Razorpay)'}
                </button>
                <button
                  onClick={handleCashPayment}
                  disabled={paying}
                  className="btn-cash"
                >
                  {paying ? 'Processing...' : 'Paid in Cash'}
                </button>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="payment-info">
              <p><strong>Payment Method:</strong> {billData.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash'}</p>
              <p><strong>Payment Date:</strong> {new Date(billData.paymentDetails?.paidAt).toLocaleDateString()}</p>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillViewModal;
