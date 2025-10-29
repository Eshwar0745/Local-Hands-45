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

// In absence of a backend payments API, create a light mock order client-side
export const createRazorpayOrder = async ({ bookingId, amount }) => {
  const key_id = process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_RT1oKKK4YicKmW";
  const order = {
    id: `order_${Math.random().toString(36).slice(2, 10)}`,
    amount: Math.max(0, Math.round(Number(amount || 0) * 100)), // paise
    key_id,
    bookingId,
    currency: "INR",
  };
  return { data: order };
};

// Mark online payment as paid on the backend (verification mocked here)
export const verifyRazorpayPayment = async ({ bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  try {
    const res = await axios.patch(`/api/bookings/${bookingId}/mark-online-paid`, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    return res;
  } catch (e) {
    return { data: { success: false, error: e?.response?.data?.message || "Failed to mark online payment" } };
  }
};

// Cash payments: simply mark as paid server-side
export const markCashPayment = async (bookingId) => {
  return axios.patch(`/api/bookings/${bookingId}/mark-cash-paid`);
};
