import axios from "axios";

// Dynamically load Razorpay Checkout script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Create a real Razorpay order via backend for a specific booking
export const createRazorpayOrder = async ({ bookingId }) => {
  const base = process.env.REACT_APP_API_URL || "/api";
  const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
  const res = await axios.post(
    `${base}/payments/create-order-for-booking/${bookingId}`,
    {},
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  // Return just the order object for compatibility with older callers
  return { data: res.data.order };
};

// Mark online payment as paid on the backend (verification mocked here)
export const verifyRazorpayPayment = async ({ bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  try {
    const base = process.env.REACT_APP_API_URL || "/api";
    const token = localStorage.getItem('lh_token') || localStorage.getItem('token');
    // First, verify signature (optional but recommended when order exists)
    await axios.post(
      `${base}/payments/verify`,
      { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    // Then mark the booking as paid
    const res = await axios.post(
      `${base}/billing/${bookingId}/mark-online-paid`,
      { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return res;
  } catch (e) {
    return { data: { success: false, error: e?.response?.data?.message || "Failed to verify payment" } };
  }
};

// Cash payments: simply mark as paid server-side
export const markCashPayment = async (bookingId) => {
  return axios.patch(`/api/bookings/${bookingId}/mark-cash-paid`);
};
