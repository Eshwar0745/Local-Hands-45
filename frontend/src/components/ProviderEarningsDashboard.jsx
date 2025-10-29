import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProviderEarningsDashboard.css';

const ProviderEarningsDashboard = () => {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('lh_token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/billing/provider/earnings`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setEarnings(response.data);
      }
    } catch (err) {
      console.error('Fetch earnings error:', err);
      setError(err.response?.data?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="earnings-loading">Loading earnings...</div>;
  }

  if (error) {
    return <div className="earnings-error">{error}</div>;
  }

  return (
    <div className="provider-earnings-dashboard">
      <div className="flex items-center justify-between">
        <h2>💰 Earnings Overview</h2>
        <button onClick={fetchEarnings} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md">Refresh</button>
      </div>
      
      <div className="earnings-cards">
        <div className="earning-card total">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Total Earnings</h3>
            <p className="amount">₹{earnings.earnings.total.toFixed(2)}</p>
            <span className="label">Lifetime earnings</span>
          </div>
        </div>

        <div className="earning-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <h3>Pending</h3>
            <p className="amount">₹{earnings.earnings.pending.toFixed(2)}</p>
            <span className="label">Bills generated, awaiting payment</span>
          </div>
        </div>

        <div className="earning-card withdrawable">
          <div className="card-icon">💵</div>
          <div className="card-content">
            <h3>Withdrawable</h3>
            <p className="amount">₹{earnings.earnings.withdrawable.toFixed(2)}</p>
            <span className="label">Available for withdrawal</span>
          </div>
        </div>
      </div>

      {earnings.completedJobs && earnings.completedJobs.length > 0 && (
        <div className="completed-jobs-section">
          <h3>Recent Completed Jobs</h3>
          <div className="jobs-list">
            {earnings.completedJobs.slice(0, 10).map((job) => (
              <div key={job._id} className="job-item">
                <div className="job-info">
                  <span className="job-id">{job.bookingId}</span>
                  <span className="job-service">{job.serviceCatalog?.name || 'Service'}</span>
                  <span className="job-customer">{job.customer?.name || 'Customer'}</span>
                </div>
                <div className="job-payment">
                  <span className="amount">₹{job.billDetails?.total.toFixed(2) || '0.00'}</span>
                  <span className={`payment-method ${job.paymentMethod}`}>
                    {job.paymentMethod === 'razorpay' ? '💳 Online' : '💵 Cash'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {earnings.transactions && earnings.transactions.length > 0 && (
        <div className="transactions-section">
          <h3>Recent Transactions</h3>
          <div className="transactions-list">
            {earnings.transactions.slice(0, 10).map((txn) => (
              <div key={txn._id} className="transaction-item">
                <div className="txn-info">
                  <span className="txn-id">{txn.transactionId}</span>
                  <span className="txn-customer">{txn.customer?.name || 'Customer'}</span>
                  <span className="txn-date">
                    {new Date(txn.paidAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="txn-amounts">
                  <div className="txn-amount-row">
                    <span className="label">Total:</span>
                    <span>₹{txn.amount.toFixed(2)}</span>
                  </div>
                  <div className="txn-amount-row">
                    <span className="label">Platform Fee (10%):</span>
                    <span className="fee">- ₹{txn.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="txn-amount-row earning">
                    <span className="label"><strong>Your Earning:</strong></span>
                    <span><strong>₹{txn.providerEarning.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderEarningsDashboard;
