import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCreditCard, FiSmartphone, FiActivity, FiX, FiCheckCircle, FiLoader, FiLock } from 'react-icons/fi';
import './MockPaymentGateway.css';

export default function MockPaymentGateway({ bookingId, amount, serviceName, customerInfo, onPaymentSuccess, onClose }) {
  const [tab, setTab] = useState('card'); // 'card' | 'upi' | 'netbanking'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardFocused, setCardFocused] = useState(false); // flip card on CVV focus
  const [upiId, setUpiId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  
  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState('input'); // 'input' | 'processing' | 'otp' | 'success' | 'failed'
  const [processingMsg, setProcessingMsg] = useState('Initiating transaction...');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [otpTimer, setOtpTimer] = useState(120);

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const matches = value.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(value);
    }
  };

  // Format expiry with slash MM/YY
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2)}`);
    } else {
      setCardExpiry(value);
    }
  };

  // Format CVV limit to 3 digits
  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCardCvv(value);
  };

  // OTP Timer countdown
  useEffect(() => {
    let interval = null;
    if (checkoutStep === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setOtpError('OTP expired. Please request a new one.');
    }
    return () => clearInterval(interval);
  }, [checkoutStep, otpTimer]);

  const initiatePayment = () => {
    // Basic inputs validations
    if (tab === 'card') {
      if (cardNumber.replace(/\s/g, '').length !== 16) {
        setPaymentError('Enter a valid 16-digit card number');
        return;
      }
      if (cardExpiry.length !== 5) {
        setPaymentError('Enter a valid card expiry (MM/YY)');
        return;
      }
      if (cardCvv.length !== 3) {
        setPaymentError('Enter a 3-digit CVV number');
        return;
      }
      if (!cardHolder.trim()) {
        setPaymentError('Enter the cardholder name');
        return;
      }
    } else if (tab === 'upi') {
      if (!upiId.includes('@') || upiId.length < 5) {
        setPaymentError('Enter a valid UPI ID (e.g. user@okhdfcbank)');
        return;
      }
    } else if (tab === 'netbanking') {
      if (!selectedBank) {
        setPaymentError('Please choose a bank from the selection');
        return;
      }
    }

    setPaymentError('');
    setCheckoutStep('processing');
    setProcessingMsg('Connecting to secure banking gateway...');

    setTimeout(() => {
      setProcessingMsg('Creating secure order signature...');
      setTimeout(() => {
        if (tab === 'upi') {
          // UPI doesn't need bank OTP validation, it validates directly
          processBackendPayment();
        } else {
          // Cards & Netbanking go to mock OTP verification
          setCheckoutStep('otp');
          setOtpTimer(120);
        }
      }, 1200);
    }, 1200);
  };

  const verifyOtp = () => {
    if (otpCode.length !== 6 || /\D/.test(otpCode)) {
      setOtpError('Please enter a valid 6-digit numeric OTP code');
      return;
    }
    setOtpError('');
    setCheckoutStep('processing');
    setProcessingMsg('Verifying OTP code credentials...');
    
    setTimeout(() => {
      processBackendPayment();
    }, 1500);
  };

  const processBackendPayment = async () => {
    setProcessingMsg('Authenticating payment with LocalHands API...');
    try {
      const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
      const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 11)}`;
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
      const mockSignature = `sig_mock_${Math.random().toString(36).substring(2, 11)}`;

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/billing/${bookingId}/mark-online-paid`,
        {
          razorpay_order_id: mockOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setCheckoutStep('success');
        setTimeout(() => {
          if (onPaymentSuccess) {
            onPaymentSuccess(response.data.booking);
          }
        }, 1500);
      } else {
        throw new Error('Transaction rejected by server');
      }
    } catch (err) {
      console.error('Mock payment error:', err);
      setCheckoutStep('failed');
      setPaymentError(err.response?.data?.message || 'Transaction processing failed');
    }
  };

  return (
    <div className="mock-payment-overlay">
      <div className="mock-payment-box">
        {/* Header */}
        <div className="mock-payment-header">
          <div className="header-brand">
            <FiLock className="icon-secure" />
            <span>Secure payment Portal</span>
          </div>
          <button className="close-checkout" onClick={onClose} disabled={checkoutStep === 'processing'}>
            <FiX />
          </button>
        </div>

        {/* Amount Banner */}
        <div className="mock-payment-summary">
          <div className="summary-left">
            <h3>LocalHands Payments</h3>
            <p>{serviceName}</p>
          </div>
          <div className="summary-right">
            <h2>₹{amount.toFixed(2)}</h2>
            <span className="badge-live">Test Environment</span>
          </div>
        </div>

        {/* Input Step */}
        {checkoutStep === 'input' && (
          <div className="checkout-body">
            {/* Tabs */}
            <div className="checkout-tabs">
              <button className={tab === 'card' ? 'active' : ''} onClick={() => { setTab('card'); setPaymentError(''); }}>
                <FiCreditCard /> Card Payment
              </button>
              <button className={tab === 'upi' ? 'active' : ''} onClick={() => { setTab('upi'); setPaymentError(''); }}>
                <FiSmartphone /> UPI / QR
              </button>
              <button className={tab === 'netbanking' ? 'active' : ''} onClick={() => { setTab('netbanking'); setPaymentError(''); }}>
                <FiActivity /> Net Banking
              </button>
            </div>

            {/* Error Message */}
            {paymentError && <div className="checkout-error">{paymentError}</div>}

            {/* Tab: Card */}
            {tab === 'card' && (
              <div className="tab-content">
                {/* 3D Visual Card Display */}
                <div className={`visual-card-container ${cardFocused ? 'flipped' : ''}`}>
                  <div className="visual-card">
                    {/* Front */}
                    <div className="card-front">
                      <div className="card-chip"></div>
                      <div className="card-brand-logo">Visa</div>
                      <div className="card-number-display">{cardNumber || '•••• •••• •••• ••••'}</div>
                      <div className="card-details-row">
                        <div>
                          <div className="card-label">CARD HOLDER</div>
                          <div className="card-value">{cardHolder.toUpperCase() || 'YOUR NAME'}</div>
                        </div>
                        <div>
                          <div className="card-label">EXPIRES</div>
                          <div className="card-value">{cardExpiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>
                    {/* Back */}
                    <div className="card-back">
                      <div className="card-magnetic-strip"></div>
                      <div className="card-signature-strip">
                        <div className="card-cvv-display">{cardCvv || '•••'}</div>
                      </div>
                      <div className="card-back-text">
                        This is a simulated test payment card. No real currency is charged.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setCardFocused(false)}
                    className="form-control"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group col-6">
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      onFocus={() => setCardFocused(false)}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group col-6">
                    <label>CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      onFocus={() => setCardFocused(true)}
                      onBlur={() => setCardFocused(false)}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="Enter Cardholder Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    onFocus={() => setCardFocused(false)}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {/* Tab: UPI */}
            {tab === 'upi' && (
              <div className="tab-content upi-content">
                <div className="qr-container">
                  <div className="mock-qr">
                    {/* Simulated QR Pattern */}
                    <div className="qr-inner">
                      <div className="qr-box top-left"></div>
                      <div className="qr-box top-right"></div>
                      <div className="qr-box bottom-left"></div>
                      <div className="qr-logo">LH</div>
                    </div>
                  </div>
                  <p className="qr-instruction">Scan this QR Code using any UPI App (GPay, PhonePe, Paytm)</p>
                  <button className="btn-scan-simulate" onClick={processBackendPayment}>
                    Simulate Successful App Scan & Pay
                  </button>
                </div>
                
                <div className="divider-or">
                  <span>OR</span>
                </div>

                <div className="form-group">
                  <label>Pay via UPI ID</label>
                  <input
                    type="text"
                    placeholder="username@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {/* Tab: Net Banking */}
            {tab === 'netbanking' && (
              <div className="tab-content netbanking-content">
                <label className="section-label">Select Popular Bank</label>
                <div className="banks-grid">
                  {[
                    { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
                    { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
                    { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
                    { id: 'axis', name: 'Axis Bank', code: 'AXIS' },
                    { id: 'kotak', name: 'Kotak Mahindra', code: 'KOTAK' },
                    { id: 'yes', name: 'Yes Bank', code: 'YES' }
                  ].map((bank) => (
                    <button
                      key={bank.id}
                      className={`bank-card ${selectedBank === bank.id ? 'selected' : ''}`}
                      onClick={() => setSelectedBank(bank.id)}
                    >
                      <span className="bank-logo-placeholder">{bank.code}</span>
                      <span className="bank-name">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pay Button */}
            <button className="btn-pay-submit" onClick={initiatePayment}>
              Pay Now (Test Environment)
            </button>
          </div>
        )}

        {/* Processing Step */}
        {checkoutStep === 'processing' && (
          <div className="checkout-body state-body">
            <FiLoader className="icon-spinner" />
            <h3 className="state-heading">Processing Payment</h3>
            <p className="state-text">{processingMsg}</p>
          </div>
        )}

        {/* OTP Verification Step */}
        {checkoutStep === 'otp' && (
          <div className="checkout-body otp-body">
            <div className="bank-otp-box">
              <div className="bank-otp-title">Secure bank Gateway Authentication</div>
              <p className="otp-desc">
                A mock One-Time Password (OTP) has been sent to the mobile number registered with your bank. 
                Please enter the mock OTP code below to authorize the transaction.
              </p>
              <div className="otp-timer">
                Time Remaining: <strong>{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</strong>
              </div>
              
              {otpError && <div className="checkout-error">{otpError}</div>}
              
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Enter 6-Digit OTP (e.g., 123456)"
                  value={otpCode}
                  maxLength={6}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="form-control otp-input-field"
                />
              </div>

              <div className="otp-buttons">
                <button className="btn-otp-submit" onClick={verifyOtp}>
                  Submit OTP Code
                </button>
                <button 
                  className="btn-otp-cancel" 
                  onClick={() => { setCheckoutStep('input'); setOtpCode(''); setOtpError(''); }}
                >
                  Cancel & Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {checkoutStep === 'success' && (
          <div className="checkout-body state-body success-state">
            <FiCheckCircle className="icon-success" />
            <h3 className="state-heading">Payment Successful!</h3>
            <p className="state-text">Your booking has been updated successfully. Redirecting...</p>
          </div>
        )}

        {/* Failed Step */}
        {checkoutStep === 'failed' && (
          <div className="checkout-body state-body failed-state">
            <div className="icon-failed">❌</div>
            <h3 className="state-heading">Transaction Failed</h3>
            <p className="state-text">{paymentError || 'Something went wrong during checkout.'}</p>
            <button className="btn-retry" onClick={() => setCheckoutStep('input')}>
              Retry Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
