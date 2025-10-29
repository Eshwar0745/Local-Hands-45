import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Transaction ID (e.g., TXN1001)
    transactionId: { type: String, required: true, unique: true },

    // Related booking
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    
    // Parties involved
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Transaction details
    amount: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    providerEarning: { type: Number, required: true }, // amount - platformFee

    // Payment information
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cash", "wallet"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed"
    },

    // Razorpay details (if applicable)
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Timestamps
    paidAt: { type: Date, default: Date.now },

    // Optional notes
    notes: { type: String }
  },
  { timestamps: true }
);

// Index for faster lookups
transactionSchema.index({ booking: 1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ provider: 1 });
transactionSchema.index({ paidAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
