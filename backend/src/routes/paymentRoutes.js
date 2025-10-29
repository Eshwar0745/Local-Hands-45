import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

function getRazorpayInstance() {
	const key_id = process.env.RAZORPAY_KEY_ID;
	const key_secret = process.env.RAZORPAY_KEY_SECRET;
	if (!key_id || !key_secret) {
		throw new Error("Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
	}
	return new Razorpay({ key_id, key_secret });
}

// Create an order for a given amount (in INR rupees)
router.post("/create-order", requireAuth, async (req, res) => {
	try {
		const { amount } = req.body; // rupees
		if (typeof amount !== "number" || amount <= 0) {
			return res.status(400).json({ message: "amount (number, rupees) is required" });
		}
		const instance = getRazorpayInstance();
		const order = await instance.orders.create({
			amount: Math.round(amount * 100),
			currency: "INR",
			receipt: `rcpt_${Date.now()}`,
		});
		return res.json({ success: true, order });
	} catch (e) {
		console.error("[payments] create-order error", e);
		res.status(500).json({ message: e.message });
	}
});

// Verify payment signature from Razorpay checkout
router.post("/verify", requireAuth, async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return res.status(400).json({ message: "Missing razorpay parameters" });
		}
		const expected = crypto
			.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
			.update(`${razorpay_order_id}|${razorpay_payment_id}`)
			.digest("hex");
		const valid = expected === razorpay_signature;
		return res.json({ success: true, valid });
	} catch (e) {
		console.error("[payments] verify error", e);
		res.status(500).json({ message: e.message });
	}
});

export default router;
