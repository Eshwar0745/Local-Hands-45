import React from 'react';
import './EstimateDisplay.css';

function EstimateDisplay({ estimate, onConfirm }) {
  return (
    <div className="estimate-display">
      <div className="estimate-card">
        <h3>📋 Your Service Estimate</h3>
        
        <div className="estimate-breakdown">
          <div className="line-item">
            <span>Service Charges</span>
            <span className="amount">₹{estimate.serviceCharge}</span>
          </div>
          <div className="line-item">
            <span>Visit Charge</span>
            <span className="amount">₹{estimate.visitCharge}</span>
          </div>
          <div className="line-item">
            <span>Platform Fee (1.2%)</span>
            <span className="amount">₹{estimate.platformFee}</span>
          </div>
          <div className="line-item subtotal">
            <span>Subtotal</span>
            <span className="amount">₹{estimate.subtotal}</span>
          </div>
          <div className="line-item total">
            <span><strong>Total Estimate</strong></span>
            <span className="amount"><strong>₹{estimate.total}</strong></span>
          </div>
        </div>

        <div className="payment-note">
          <p>💳 <strong>Payment After Service</strong></p>
          <p className="note-text">
            You'll pay after the service is completed. No advance payment needed!
          </p>
        </div>

        <button className="btn-proceed" onClick={onConfirm}>
          ✓ Looks Good! Schedule Service
        </button>

        <p className="disclaimer">
          💡 This is an estimated price. Final amount may vary based on actual work done.
        </p>
      </div>
    </div>
  );
}

export default EstimateDisplay;
