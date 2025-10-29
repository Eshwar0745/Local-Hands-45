import express from "express";
import {
  generateBill,
  getBill,
  markOnlinePaidWithTransaction,
  markCashPaidWithTransaction,
  getProviderEarnings,
  getCustomerPaymentHistory,
  getAdminRevenue
} from "../controllers/billingController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Provider generates bill after completing job
router.post("/:id/generate-bill", requireAuth, generateBill);

// Get bill details (customer or provider)
router.get("/:id/bill", requireAuth, getBill);

// Send bill to customer (provider action)
router.post("/:id/send-bill", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const Booking = (await import("../models/Booking.js")).default;
    
    const booking = await Booking.findById(id)
      .populate("customer", "name email phone")
      .populate("provider", "name");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Verify provider owns this booking
    if (!booking.provider || booking.provider._id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Verify bill exists
    if (!booking.billDetails) {
      return res.status(400).json({ message: "Bill not generated yet" });
    }
    
    // Mark bill as sent
    booking.billSentAt = new Date();
    await booking.save();
    
    res.json({
      success: true,
      message: "Bill sent to customer",
      booking: {
        bookingId: booking.bookingId,
        billDetails: booking.billDetails,
        customer: booking.customer
      }
    });
  } catch (error) {
    console.error("Send bill error:", error);
    res.status(500).json({ message: "Error sending bill", error: error.message });
  }
});

// Payment endpoints with transaction creation
router.post("/:id/mark-online-paid", requireAuth, markOnlinePaidWithTransaction);
router.post("/:id/mark-cash-paid", requireAuth, markCashPaidWithTransaction);

// Analytics endpoints
router.get("/provider/earnings", requireAuth, getProviderEarnings);
router.get("/customer/payment-history", requireAuth, getCustomerPaymentHistory);
router.get("/admin/revenue", requireAuth, getAdminRevenue); // Should add admin middleware

export default router;
