import Booking from "../models/Booking.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import mongoose from "mongoose";

// Helper function to generate a unique, padded transaction ID (with retry on duplicate)
async function nextTransactionId(retry = 0) {
  const res = await mongoose.connection.db.collection("counters").findOneAndUpdate(
    { _id: "transactionId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = (res && res.value && typeof res.value.seq === 'number') ? res.value.seq : 1;
  const padded = String(seq).padStart(6, '0');
  const id = `TXN${padded}`;
  // Check for duplicate
  const exists = await mongoose.connection.db.collection("transactions").findOne({ transactionId: id });
  if (exists && retry < 5) {
    // Try again (should be rare)
    return nextTransactionId(retry + 1);
  }
  return id;
}

// Provider generates bill for completed job
export const generateBill = async (req, res) => {
  try {
    const { id } = req.params; // booking ID
    let { serviceCharges, extraFees = 0, discount = 0, tax = 0, notes = "" } = req.body;

    const booking = await Booking.findById(id).populate("provider customer serviceCatalog");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify provider owns this booking
    if (booking.provider._id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to generate bill for this booking" });
    }

    // Verify booking is completed
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Booking must be completed before generating bill" });
    }

    // Verify bill hasn't been generated already
    if (booking.paymentStatus === "billed" || booking.paymentStatus === "paid") {
      return res.status(400).json({ message: "Bill already generated for this booking" });
    }

    // ✅ If no serviceCharges provided, use the questionnaire estimate
    if (!serviceCharges && booking.serviceDetails?.estimate) {
      const estimate = booking.serviceDetails.estimate;
      
      // Use all estimate components
      serviceCharges = Number(estimate.serviceCharge) || 0;
      extraFees = Number(estimate.visitCharge) || 0;
      
      // Platform fee should not be in extra fees, it's calculated separately
      const platformFee = Number(estimate.platformFee) || 0;
      const estimatedTotal = Number(estimate.total) || 0;
      
      notes = notes || `Bill generated from initial estimate for ${estimate.breakdown?.serviceName || 'Service'}. Estimate: ₹${estimatedTotal} (Service: ₹${serviceCharges} + Visit: ₹${extraFees} + Platform Fee: ₹${platformFee})`;
      
      console.log('📋 Using questionnaire estimate for bill:', { 
        serviceCharges, 
        extraFees,
        platformFee,
        total: estimatedTotal,
        estimate 
      });
    }

    // Validate input
    if (!serviceCharges || serviceCharges < 0) {
      return res.status(400).json({ message: "Service charges are required and must be positive" });
    }

    // Calculate bill totals
    const subtotal = Number(serviceCharges) + Number(extraFees) - Number(discount);
    const taxAmount = (subtotal * Number(tax)) / 100;
    const total = subtotal + taxAmount;

    // Update booking with bill details
    booking.billDetails = {
      serviceCharges: Number(serviceCharges),
      extraFees: Number(extraFees),
      discount: Number(discount),
      tax: Number(tax),
      subtotal: subtotal,
      total: total,
      notes: notes,
      generatedAt: new Date(),
      generatedBy: req.userId
    };

    booking.paymentStatus = "billed";
    await booking.save();

    // Update provider's pending earnings
    await User.findByIdAndUpdate(booking.provider._id, {
      $inc: { pendingEarnings: total }
    });

    res.json({
      success: true,
      message: "Bill generated successfully",
      booking,
      billDetails: booking.billDetails
    });
  } catch (error) {
    console.error("Generate bill error:", error);
    res.status(500).json({ message: "Error generating bill", error: error.message });
  }
};

// Get bill details for a booking
export const getBill = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate("customer", "name email phone")
      .populate("provider", "name email phone rating")
      .populate("serviceCatalog", "name");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify user is customer or provider of this booking
    const userId = req.userId;
    const isCustomer = booking.customer._id.toString() === userId;
    const isProvider = booking.provider && booking.provider._id.toString() === userId;

    if (!isCustomer && !isProvider) {
      return res.status(403).json({ message: "Not authorized to view this bill" });
    }

    // Check if bill has been generated
    if (!booking.billDetails || !booking.billDetails.generatedAt) {
      return res.status(404).json({ message: "Bill not yet generated" });
    }

    res.json({
      success: true,
      booking: {
        bookingId: booking.bookingId,
        serviceName: booking.serviceCatalog?.name || "Service",
        customer: booking.customer,
        provider: booking.provider,
        completedAt: booking.completedAt,
        billDetails: booking.billDetails,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod
      }
    });
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({ message: "Error fetching bill", error: error.message });
  }
};

// Update existing payment controllers to create transaction records
export const markOnlinePaidWithTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const booking = await Booking.findById(id).populate("provider customer");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify customer owns this booking
    if (booking.customer._id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Verify bill has been generated
    if (!booking.billDetails || !booking.billDetails.total) {
      return res.status(400).json({ message: "Bill not generated yet" });
    }

    // Ensure provider is assigned before recording a transaction
    if (!booking.provider) {
      return res.status(400).json({ message: "No provider assigned to this booking" });
    }

    const amount = booking.billDetails.total;
    const platformFee = amount * 0.10; // 10% platform fee
    const providerEarning = amount - platformFee;

    // Mark booking as paid
    booking.paymentStatus = "paid";
    booking.paymentMethod = "razorpay";
    booking.paymentDetails = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paidAt: new Date()
    };
    await booking.save();

    // Create transaction record
    const transactionId = await nextTransactionId();
    const transaction = await Transaction.create({
      transactionId,
      booking: booking._id,
      customer: booking.customer._id,
      provider: booking.provider._id,
      amount: amount,
      platformFee: platformFee,
      providerEarning: providerEarning,
      paymentMethod: "razorpay",
      paymentStatus: "completed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date()
    });

    // Update provider earnings
    await User.findByIdAndUpdate(booking.provider._id, {
      $inc: {
        totalEarnings: providerEarning,
        withdrawableBalance: providerEarning,
        pendingEarnings: -amount // Deduct from pending
      }
    });

    res.json({
      success: true,
      message: "Payment verified successfully",
      booking,
      transaction
    });
  } catch (error) {
    console.error("Mark online paid error:", error);
    res.status(500).json({ message: "Error processing payment", error: error.message });
  }
};

// Cash payment with transaction
export const markCashPaidWithTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate("provider customer");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify customer owns this booking
    if (booking.customer._id.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Verify bill has been generated
    if (!booking.billDetails || !booking.billDetails.total) {
      return res.status(400).json({ message: "Bill not generated yet" });
    }

    const amount = booking.billDetails.total;
    const platformFee = amount * 0.10; // 10% platform fee
    const providerEarning = amount - platformFee;

    // Mark booking as paid
    booking.paymentStatus = "paid";
    booking.paymentMethod = "cash";
    booking.paymentDetails = {
      paidAt: new Date()
    };
    await booking.save();

    // Create transaction record
    const transactionId = await nextTransactionId();
    const transaction = await Transaction.create({
      transactionId,
      booking: booking._id,
      customer: booking.customer._id,
      provider: booking.provider._id,
      amount: amount,
      platformFee: platformFee,
      providerEarning: providerEarning,
      paymentMethod: "cash",
      paymentStatus: "completed",
      paidAt: new Date()
    });

    // Update provider earnings
    await User.findByIdAndUpdate(booking.provider._id, {
      $inc: {
        totalEarnings: providerEarning,
        withdrawableBalance: providerEarning,
        pendingEarnings: -amount // Deduct from pending
      }
    });

    res.json({
      success: true,
      message: "Cash payment confirmed",
      booking,
      transaction
    });
  } catch (error) {
    console.error("Mark cash paid error:", error);
    res.status(500).json({ message: "payment successful", error: error.message });
  }
};

// Get provider earnings summary
export const getProviderEarnings = async (req, res) => {
  try {
    const providerId = req.userId;

    const provider = await User.findById(providerId).select("totalEarnings pendingEarnings withdrawableBalance");
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    // Get completed jobs with payments
    const completedBookings = await Booking.find({
      provider: providerId,
      paymentStatus: "paid"
    })
      .populate("customer", "name")
      .populate("serviceCatalog", "name")
      .select("bookingId serviceCatalog customer billDetails paymentMethod completedAt")
      .sort({ completedAt: -1 })
      .limit(50);

    // Get all transactions for this provider
    const transactions = await Transaction.find({ provider: providerId })
      .populate("customer", "name")
      .populate("booking", "bookingId")
      .sort({ paidAt: -1 })
      .limit(50);

    res.json({
      success: true,
      earnings: {
        total: provider.totalEarnings,
        pending: provider.pendingEarnings,
        withdrawable: provider.withdrawableBalance
      },
      completedJobs: completedBookings,
      transactions
    });
  } catch (error) {
    console.error("Get provider earnings error:", error);
    res.status(500).json({ message: "Error fetching earnings", error: error.message });
  }
};

// Get customer payment history
export const getCustomerPaymentHistory = async (req, res) => {
  try {
    const customerId = req.userId;

    const transactions = await Transaction.find({ customer: customerId })
      .populate("provider", "name rating")
      .populate("booking", "bookingId serviceCatalog")
      .populate({
        path: "booking",
        populate: { path: "serviceCatalog", select: "name" }
      })
      .sort({ paidAt: -1 })
      .limit(50);

    const totalSpent = await Transaction.aggregate([
      { $match: { customer: new mongoose.Types.ObjectId(customerId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      success: true,
      totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0,
      transactions
    });
  } catch (error) {
    console.error("Get customer payment history error:", error);
    res.status(500).json({ message: "Error fetching payment history", error: error.message });
  }
};

// Admin: Get all transactions and revenue
export const getAdminRevenue = async (req, res) => {
  try {
    // Total revenue (sum of all platform fees)
    const revenueData = await Transaction.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$platformFee" }, totalTransactions: { $sum: 1 }, totalAmount: { $sum: "$amount" } } }
    ]);

    // Total provider earnings
    const providerEarningsData = await Transaction.aggregate([
      { $group: { _id: null, totalProviderEarnings: { $sum: "$providerEarning" } } }
    ]);

    // Recent transactions
    const recentTransactions = await Transaction.find()
      .populate("customer", "name email")
      .populate("provider", "name email")
      .populate("booking", "bookingId")
      .sort({ paidAt: -1 })
      .limit(100);

    res.json({
      success: true,
      revenue: {
        platformRevenue: revenueData.length > 0 ? revenueData[0].totalRevenue : 0,
        totalTransactions: revenueData.length > 0 ? revenueData[0].totalTransactions : 0,
        providerEarnings: providerEarningsData.length > 0 ? providerEarningsData[0].totalProviderEarnings : 0,
        totalAmount: revenueData.length > 0 ? revenueData[0].totalAmount : 0
      },
      recentTransactions
    });
  } catch (error) {
    console.error("Get admin revenue error:", error);
    res.status(500).json({ message: "Error fetching revenue data", error: error.message });
  }
};
