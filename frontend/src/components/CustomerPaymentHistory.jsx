import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CustomerPaymentHistory.css';

const CustomerPaymentHistory = () => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('lh_token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/billing/customer/payment-history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('Fetch payment history error:', err);
      setError(err.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="payment-loading">Loading payment history...</div>;
  }

  if (error) {
    return <div className="payment-error">{error}</div>;
  }

  return (
    <div className="customer-payment-history">
      <h2>💳 Payment History</h2>
      
      <div className="total-spent-card">
        <div className="card-icon">💰</div>
        <div className="card-content">
          <h3>Total Spent</h3>
          <p className="amount">₹{history.totalSpent.toFixed(2)}</p>
          <span className="label">All-time spending on LocalHands</span>
        </div>
      </div>

      {history.transactions && history.transactions.length > 0 ? (
        <div className="transactions-section">
          <h3>Transaction History</h3>
          <div className="transactions-list">
            {history.transactions.map((txn) => (
              <div key={txn._id} className="transaction-item">
                <div className="txn-header">
                  <div className="txn-main-info">
                    <span className="txn-id">{txn.transactionId}</span>
                    <span className="txn-service">
                      {txn.booking?.serviceCatalog?.name || 'Service'}
                    </span>
                    <span className="txn-provider">
                      Provider: {txn.provider?.name || 'N/A'}
                      {txn.provider?.rating && (
                        <span className="provider-rating"> ⭐ {txn.provider.rating.toFixed(1)}</span>
                      )}
                    </span>
                  </div>
                  <div className="txn-amount-info">
                    <span className="amount">₹{txn.amount.toFixed(2)}</span>
                    <span className={`payment-method ${txn.paymentMethod}`}>
                      {txn.paymentMethod === 'razorpay' ? '💳 Online' : '💵 Cash'}
                    </span>
                    <span className="txn-date">
                      {new Date(txn.paidAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                
                {txn.paymentMethod === 'razorpay' && txn.razorpayPaymentId && (
                  <div className="txn-details">
                    <span className="detail-label">Payment ID:</span>
                    <span className="detail-value">{txn.razorpayPaymentId}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-transactions">
          <p>No payment history yet.</p>
          <p className="subtitle">Your completed and paid bookings will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default CustomerPaymentHistory;
