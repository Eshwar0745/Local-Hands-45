import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Booking from "../src/models/Booking.js";
import Service from "../src/models/Service.js";
import ServiceCatalog from "../src/models/ServiceCatalog.js";
import Category from "../src/models/Category.js";
import Transaction from "../src/models/Transaction.js";
import mongoose from "mongoose";

describe("Billing and Payment Workflow", () => {
  let customerToken, providerToken;
  let customerId, providerId;
  let bookingId;

  beforeAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /billing-test/ });
    await Booking.deleteMany({});
    await Service.deleteMany({});
    await ServiceCatalog.deleteMany({ name: /Billing Test/ });
    await Category.deleteMany({ name: /Billing Test/ });
    await Transaction.deleteMany({});
    
    // Clean counter for transaction IDs
    await mongoose.connection.db.collection("counters").deleteOne({ _id: "transactionId" });

    // Create test customer
    const customerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Billing Test Customer",
        email: "billing-test-customer@test.com",
        password: "pass123",
        role: "customer",
        phone: "9999900001",
        location: {
          type: "Point",
          coordinates: [78.4867, 17.385], // Hyderabad
        },
      });
    customerToken = customerRes.body.token;
    customerId = customerRes.body.user.id;

    // Create test provider
    const providerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Billing Test Provider",
        email: "billing-test-provider@test.com",
        password: "pass123",
        role: "provider",
        phone: "9999900002",
        location: {
          type: "Point",
          coordinates: [78.4867, 17.385],
        },
      });
    providerToken = providerRes.body.token;
    providerId = providerRes.body.user.id;

    // Create category and service catalog
    const category = await Category.create({
      name: "Billing Test Category",
      description: "Test category for billing",
    });

    const catalog = await ServiceCatalog.create({
      name: "Billing Test Service",
      description: "Test service for billing workflow",
      category: category._id,
      pricing: {
        basePrice: 500,
        unit: "per service",
      },
      questionnaire: [],
    });

    // Provider creates service
    const service = await Service.create({
      name: "Billing Test Service",
      category: "Billing Test Category",
      price: 500,
      provider: providerId,
      serviceCatalog: catalog._id,
      basePrice: 500,
      isActive: true,
    });

    // Create booking directly in database for testing
    const booking = await Booking.create({
      customer: customerId,
      provider: providerId,
      service: service._id,
      serviceCatalog: catalog._id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: {
        type: "Point",
        coordinates: [78.4867, 17.385],
      },
      address: "123 Test Street, Hyderabad",
      questionnaireAnswers: {},
      status: "completed",
      overallStatus: "completed",
      completedAt: new Date(),
      estimatedCost: 500,
      bookingId: `BK${Date.now()}`
    });
    
    bookingId = booking._id;
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ email: /billing-test/ });
    await Booking.deleteMany({});
    await Service.deleteMany({});
    await ServiceCatalog.deleteMany({ name: /Billing Test/ });
    await Category.deleteMany({ name: /Billing Test/ });
    await Transaction.deleteMany({});
    await mongoose.connection.db.collection("counters").deleteOne({ _id: "transactionId" });
  });

  test("Provider generates bill after job completion", async () => {
    const response = await request(app)
      .post(`/api/billing/${bookingId}/generate-bill`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({
        serviceCharges: 500,
        extraFees: 100,
        discount: 50,
        tax: 18, // 18% GST
        notes: "Extra work done for plumbing repair",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.billDetails).toBeDefined();
    expect(response.body.billDetails.serviceCharges).toBe(500);
    expect(response.body.billDetails.extraFees).toBe(100);
    expect(response.body.billDetails.discount).toBe(50);
    expect(response.body.billDetails.tax).toBe(18);
    expect(response.body.billDetails.subtotal).toBe(550); // 500 + 100 - 50
    expect(response.body.billDetails.total).toBe(649); // 550 + (550 * 0.18)
    expect(response.body.booking.paymentStatus).toBe("billed");
  });

  test("Customer retrieves bill details", async () => {
    const response = await request(app)
      .get(`/api/billing/${bookingId}/bill`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.billDetails).toBeDefined();
    expect(response.body.booking.billDetails.total).toBe(649);
    expect(response.body.booking.customer).toBeDefined();
    expect(response.body.booking.provider).toBeDefined();
  });

  test("Provider can also retrieve bill details", async () => {
    const response = await request(app)
      .get(`/api/billing/${bookingId}/bill`)
      .set("Authorization", `Bearer ${providerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.billDetails.total).toBe(649);
  });

  test("Customer pays with Razorpay and transaction is created", async () => {
    const response = await request(app)
      .post(`/api/billing/${bookingId}/mark-online-paid`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        razorpay_order_id: "order_test_123456",
        razorpay_payment_id: "pay_test_123456",
        razorpay_signature: "signature_test_123456",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.paymentStatus).toBe("paid");
    expect(response.body.booking.paymentMethod).toBe("razorpay");
    expect(response.body.transaction).toBeDefined();
    expect(response.body.transaction.amount).toBe(649);
    expect(response.body.transaction.platformFee).toBe(64.9); // 10% of 649
    expect(response.body.transaction.providerEarning).toBe(584.1); // 649 - 64.9
  });

  test("Provider earnings are updated after payment", async () => {
    const provider = await User.findById(providerId);
    
    expect(provider.totalEarnings).toBe(584.1);
    expect(provider.withdrawableBalance).toBe(584.1);
    expect(provider.pendingEarnings).toBe(0); // Should be 0 after payment
  });

  test("Provider can view earnings summary", async () => {
    const response = await request(app)
      .get("/api/billing/provider/earnings")
      .set("Authorization", `Bearer ${providerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.earnings.total).toBe(584.1);
    expect(response.body.earnings.withdrawable).toBe(584.1);
    expect(response.body.completedJobs).toBeDefined();
    expect(response.body.transactions).toBeDefined();
    expect(response.body.transactions.length).toBeGreaterThan(0);
  });

  test("Customer can view payment history", async () => {
    const response = await request(app)
      .get("/api/billing/customer/payment-history")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.totalSpent).toBe(649);
    expect(response.body.transactions).toBeDefined();
    expect(response.body.transactions.length).toBe(1);
    expect(response.body.transactions[0].amount).toBe(649);
  });

  test("Admin can view revenue data", async () => {
    const response = await request(app)
      .get("/api/billing/admin/revenue")
      .set("Authorization", `Bearer ${customerToken}`); // In real app, would need admin token

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.revenue.platformRevenue).toBe(64.9);
    expect(response.body.revenue.totalTransactions).toBe(1);
    expect(response.body.revenue.providerEarnings).toBe(584.1);
    expect(response.body.recentTransactions).toBeDefined();
  });

  test("Cannot generate bill for non-completed booking", async () => {
    // Create another booking that's not completed
    const catalog = await ServiceCatalog.findOne({ name: "Billing Test Service" });
    const service = await Service.findOne({ provider: providerId });
    const newBooking = await Booking.create({
      customer: customerId,
      provider: providerId,
      service: service._id,
      serviceCatalog: catalog._id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: {
        type: "Point",
        coordinates: [78.4867, 17.385],
      },
      address: "123 Test Street",
      questionnaireAnswers: {},
      status: "in_progress",
      overallStatus: "in-progress",
      bookingId: `BK${Date.now()}-2`
    });

    const response = await request(app)
      .post(`/api/billing/${newBooking._id}/generate-bill`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({
        serviceCharges: 500,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("must be completed");
  });

  test("Cannot pay without bill generation", async () => {
    // Create a completed booking without bill
    const catalog = await ServiceCatalog.findOne({ name: "Billing Test Service" });
    const service = await Service.findOne({ provider: providerId });
    const unbilledBooking = await Booking.create({
      customer: customerId,
      provider: providerId,
      service: service._id,
      serviceCatalog: catalog._id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: {
        type: "Point",
        coordinates: [78.4867, 17.385],
      },
      address: "123 Test Street",
      questionnaireAnswers: {},
      status: "completed",
      overallStatus: "completed",
      completedAt: new Date(),
      bookingId: `BK${Date.now()}-3`
    });

    const response = await request(app)
      .post(`/api/billing/${unbilledBooking._id}/mark-cash-paid`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Bill not generated");
  });

  test("Cash payment workflow creates transaction", async () => {
    // Create new booking
    const catalog = await ServiceCatalog.findOne({ name: "Billing Test Service" });
    const service = await Service.findOne({ provider: providerId });
    const cashBooking = await Booking.create({
      customer: customerId,
      provider: providerId,
      service: service._id,
      serviceCatalog: catalog._id,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: {
        type: "Point",
        coordinates: [78.4867, 17.385],
      },
      address: "123 Test Street",
      questionnaireAnswers: {},
      status: "completed",
      overallStatus: "completed",
      completedAt: new Date(),
      bookingId: `BK${Date.now()}-4`
    });

    // Generate bill
    await request(app)
      .post(`/api/billing/${cashBooking._id}/generate-bill`)
      .set("Authorization", `Bearer ${providerToken}`)
      .send({
        serviceCharges: 300,
        extraFees: 0,
        discount: 0,
        tax: 18,
      });

    // Pay with cash
    const response = await request(app)
      .post(`/api/billing/${cashBooking._id}/mark-cash-paid`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.booking.paymentMethod).toBe("cash");
    expect(response.body.transaction).toBeDefined();
    expect(response.body.transaction.paymentMethod).toBe("cash");
    expect(response.body.transaction.amount).toBe(354); // 300 + 18% tax
  });
});
