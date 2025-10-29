import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Get auth token
const getAuthHeader = () => {
  const token = localStorage.getItem('lh_token');
  return { Authorization: `Bearer ${token}` };
};

export const BillingAPI = {
  // Provider: Generate bill for completed job
  generateBill: async (bookingId, billData) => {
    try {
      const response = await axios.post(
        `${API_URL}/billing/${bookingId}/generate-bill`,
        billData,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get bill details (customer or provider)
  getBill: async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_URL}/billing/${bookingId}/bill`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Pay bill online via Razorpay
  markOnlinePaid: async (bookingId, paymentDetails) => {
    try {
      const response = await axios.post(
        `${API_URL}/billing/${bookingId}/mark-online-paid`,
        paymentDetails,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Confirm cash payment
  markCashPaid: async (bookingId) => {
    try {
      const response = await axios.post(
        `${API_URL}/billing/${bookingId}/mark-cash-paid`,
        {},
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Provider: Get earnings summary and transaction history
  getProviderEarnings: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/billing/provider/earnings`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Customer: Get payment history
  getCustomerPaymentHistory: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/billing/customer/payment-history`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Get platform revenue analytics
  getAdminRevenue: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/billing/admin/revenue`,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default BillingAPI;
