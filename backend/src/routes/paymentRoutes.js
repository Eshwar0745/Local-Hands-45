import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { requireAuth } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";

const router = Router();

function getRazorpayInstance() {
	const key_id = process.env.RAZORPAY_KEY_ID;
	const key_secret = process.env.RAZORPAY_KEY_SECRET;
	if (!key_id || !key_secret) {
		throw new Error("Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
	}
	return new Razorpay({ key_id, key_secret });
}

// Public config for frontend: expose Razorpay key id (safe/public)
router.get("/config", (_req, res) => {
	const keyId = process.env.RAZORPAY_KEY_ID || "";
	const mode = keyId.startsWith("rzp_test_") ? "test" : (keyId ? "live" : "unset");
	res.json({ keyId, mode });
});

// Developer self-test endpoint to validate Razorpay integration quickly
router.get("/selftest", requireAuth, async (req, res) => {
	try {
		const keyId = process.env.RAZORPAY_KEY_ID || "";
		const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
		const diagnostics = {
			keyIdPresent: Boolean(keyId),
			keySecretPresent: Boolean(keySecret),
			mode: keyId.startsWith("rzp_test_") ? "test" : (keyId ? "live" : "unset"),
		};
		if (!keyId || !keySecret) {
			return res.status(400).json({ ok: false, diagnostics, message: "Missing Razorpay credentials" });
		}
		// Optional: create a tiny order when ?create=1 to verify server-side auth
		if (req.query.create === '1') {
			const instance = getRazorpayInstance();
			const order = await instance.orders.create({ amount: 100, currency: 'INR', receipt: `selftest_${Date.now()}` });
			return res.json({ ok: true, diagnostics, order });
		}
		return res.json({ ok: true, diagnostics });
	} catch (e) {
		console.error('[payments] selftest error', e);
		res.status(500).json({ ok: false, message: e.message, stack: e.stack });
	}
});

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
		const status = e?.statusCode || 500;
		return res.status(status).json({
			message: e?.error?.description || e.message || "Order creation failed",
			code: e?.error?.code || undefined,
			details: e?.error || undefined,
		});
	}
});

// Create an order directly from a booking's bill (authoritative amount)
router.post("/create-order-for-booking/:id", requireAuth, async (req, res) => {
	try {
		const { id } = req.params; // booking _id
		const booking = await Booking.findById(id).select("customer billDetails paymentStatus bookingId");
		if (!booking) return res.status(404).json({ message: "Booking not found" });
		// Only the booking's customer can create an order
		if (booking.customer.toString() !== req.userId) {
			return res.status(403).json({ message: "Not authorized" });
		}
		// Ensure bill exists and has a positive total
		const total = Number(booking.billDetails?.total || 0);
		if (!booking.billDetails?.generatedAt || !total || total <= 0) {
			return res.status(400).json({ message: "Bill not generated or amount invalid" });
		}
		const instance = getRazorpayInstance();
		// Razorpay requires receipt length <= 40
		const shortId = (booking.bookingId || String(id)).toString().slice(-12);
		const ts = Date.now().toString().slice(-6);
		const safeReceipt = `b_${shortId}_${ts}`; // well under 40 chars
		const order = await instance.orders.create({
			amount: Math.round(total * 100),
			currency: "INR",
			receipt: safeReceipt,
			notes: { bookingId: id, bookingCode: booking.bookingId || undefined }
		});
		return res.json({ success: true, order, amount: Math.round(total * 100) });
	} catch (e) {
		console.error("[payments] create-order-for-booking error", e?.error || e);
		const status = e?.statusCode || 500;
		return res.status(status).json({
			message: e?.error?.description || e.message || "Order creation failed",
			code: e?.error?.code || undefined,
			details: e?.error || undefined,
		});
	}
});

// Verify payment signature from Razorpay checkout
router.post("/verify", requireAuth, async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return res.status(400).json({ message: "Missing razorpay parameters" });
		}
		const keySecret = process.env.RAZORPAY_KEY_SECRET;
		if (!keySecret) {
			return res.status(400).json({ message: "Razorpay secret not configured on server" });
		}
		const expected = crypto
			.createHmac("sha256", keySecret)
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
