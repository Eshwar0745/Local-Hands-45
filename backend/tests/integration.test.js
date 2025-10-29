import request from 'supertest';
import mongoose from 'mongoose';
process.env.NODE_ENV = 'test';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Service from '../src/models/Service.js';
import ServiceCatalog from '../src/models/ServiceCatalog.js';
import ServiceTemplate from '../src/models/ServiceTemplate.js';
import Category from '../src/models/Category.js';
import Booking from '../src/models/Booking.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function token(user) { 
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret'); 
}

describe('Integration Tests - Full Customer Journey', () => {
  let customer, provider1, provider2, provider3, acCatalog, category, template;

  beforeAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /integration\.test/ } });
    await Service.deleteMany({});
    await Category.deleteMany({ name: 'Test Category' });
    await ServiceTemplate.deleteMany({ name: 'Test AC Service' });
    await ServiceCatalog.deleteMany({ name: 'Test AC Service' });
    await Booking.deleteMany({});

    // Create test category and template
    category = await Category.create({ name: 'Test Category' });
    template = await ServiceTemplate.create({
      name: 'Test AC Service',
      category: category._id,
      defaultPrice: 500,
      active: true
    });

    // Create service catalog with questionnaire
    acCatalog = await ServiceCatalog.create({
      name: 'Test AC Service',
      category: 'Test Category',
      description: 'AC repair and maintenance',
      icon: '❄️',
      basePrice: 500,
      template: template._id,
      questionnaire: [
        { id: 'ac_type', question: 'AC Type?', type: 'radio', options: ['Split', 'Window'], required: true },
        { id: 'issues', question: 'Issues?', type: 'checkbox', options: ['Gas refilling', 'Complete servicing'], required: true },
        { id: 'units', question: 'Number of units?', type: 'number', required: true }
      ],
      pricing: {
        basePrice: 300,
        visitCharge: 100,
        optionPrices: new Map([
          ['ac_type_Split', 200],
          ['ac_type_Window', 100],
          ['issues_Gas refilling', 150],
          ['issues_Complete servicing', 200]
        ])
      }
    });

    // Create test customer
    customer = await User.create({
      name: 'Integration Customer',
      email: 'customer.integration.test@test.com',
      password: await bcrypt.hash('test123', 10),
      role: 'customer',
      location: { type: 'Point', coordinates: [78.4867, 17.3850] }
    });

    // Create test providers with different ratings and locations
    provider1 = await User.create({
      name: 'Provider High Rating',
      email: 'provider1.integration.test@test.com',
      password: await bcrypt.hash('test123', 10),
      role: 'provider',
      rating: 4.8,
      ratingCount: 50,
      isAvailable: true,
      isApproved: true,
      location: { type: 'Point', coordinates: [78.4890, 17.3860] }, // ~2km
      locationUpdatedAt: new Date()
    });

    provider2 = await User.create({
      name: 'Provider Medium Rating',
      email: 'provider2.integration.test@test.com',
      password: await bcrypt.hash('test123', 10),
      role: 'provider',
      rating: 4.2,
      ratingCount: 30,
      isAvailable: true,
      isApproved: true,
      location: { type: 'Point', coordinates: [78.5067, 17.3950] }, // ~6km
      locationUpdatedAt: new Date()
    });

    provider3 = await User.create({
      name: 'Provider Low Rating',
      email: 'provider3.integration.test@test.com',
      password: await bcrypt.hash('test123', 10),
      role: 'provider',
      rating: 3.6,
      ratingCount: 20,
      isAvailable: true,
      isApproved: true,
      location: { type: 'Point', coordinates: [78.5267, 17.4050] }, // ~10km
      locationUpdatedAt: new Date()
    });

    // Create services for providers linked to template
    await Service.create({
      name: 'Test AC Service',
      category: 'Test Category',
      price: 500,
      provider: provider1._id,
      template: template._id,
      lockedPrice: true
    });

    await Service.create({
      name: 'Test AC Service',
      category: 'Test Category',
      price: 600,
      provider: provider2._id,
      template: template._id,
      lockedPrice: true
    });

    await Service.create({
      name: 'Test AC Service',
      category: 'Test Category',
      price: 450,
      provider: provider3._id,
      template: template._id,
      lockedPrice: true
    });
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: { $regex: /integration\.test/ } });
    await Service.deleteMany({});
    await Category.deleteMany({ name: 'Test Category' });
    await ServiceTemplate.deleteMany({ name: 'Test AC Service' });
    await ServiceCatalog.deleteMany({ name: 'Test AC Service' });
    await Booking.deleteMany({});
    
    if (mongoose.connection.readyState) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  describe('1. Estimate Calculation', () => {
    it('should calculate estimate with questionnaire answers', async () => {
      const res = await request(app)
        .post('/api/bookings/calculate-estimate')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          answers: {
            ac_type: 'Split',
            issues: ['Gas refilling', 'Complete servicing'],
            units: 2
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.estimate).toBeDefined();
      expect(res.body.estimate.total).toBeGreaterThan(0);
      expect(res.body.estimate.breakdown).toBeDefined();
    });
  });

  describe('2. Provider Sorting - Highest Rated', () => {
    it('should create booking with rating preference and assign highest rated provider', async () => {
      const res = await request(app)
        .post('/api/bookings/create-with-questionnaire')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
          serviceDetails: {
            answers: { ac_type: 'Split', issues: ['Gas refilling'], units: 2 },
            estimate: { total: 800 }
          },
          sortPreference: 'rating',
          location: { lng: 78.4867, lat: 17.3850 }
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toBeDefined();
      
      // Check candidates endpoint
      const candidatesRes = await request(app)
        .get(`/api/bookings/${res.body.booking._id}/candidates`)
        .set('Authorization', `Bearer ${token(customer)}`);
      
      expect(candidatesRes.status).toBe(200);
      expect(candidatesRes.body.candidates).toBeDefined();
      expect(candidatesRes.body.candidates.length).toBeGreaterThan(0);
      
      // First candidate should be highest rated (provider1 with 4.8 rating)
      const firstCandidate = candidatesRes.body.candidates[0];
      expect(firstCandidate.rating).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('3. Provider Sorting - Nearest', () => {
    it('should create booking with nearby preference', async () => {
      const res = await request(app)
        .post('/api/bookings/create-with-questionnaire')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
          serviceDetails: {
            answers: { ac_type: 'Window', issues: ['Complete servicing'], units: 1 },
            estimate: { total: 600 }
          },
          sortPreference: 'nearby',
          location: { lng: 78.4867, lat: 17.3850 }
        });

      expect(res.status).toBe(201);
      
      const candidatesRes = await request(app)
        .get(`/api/bookings/${res.body.booking._id}/candidates`)
        .set('Authorization', `Bearer ${token(customer)}`);
      
      expect(candidatesRes.status).toBe(200);
      // First candidate should be nearest (provider1 at ~2km)
      const firstCandidate = candidatesRes.body.candidates[0];
      expect(firstCandidate.distanceKm).toBeLessThan(5);
    });
  });

  describe('4. Payment Routes', () => {
    let testBooking;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/bookings/create-with-questionnaire')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
          serviceDetails: {
            answers: { ac_type: 'Split', issues: ['Gas refilling'], units: 1 },
            estimate: { total: 700 }
          },
          sortPreference: 'rating',
          location: { lng: 78.4867, lat: 17.3850 }
        });
      testBooking = res.body.booking;
    });

    it('should mark booking as paid via Razorpay', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/mark-online-paid`)
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          razorpay_order_id: 'order_test123',
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: 'sig_test789'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.paymentStatus).toBe('paid');
      expect(res.body.booking.paymentMethod).toBe('razorpay');
    });

    it('should mark booking as paid via Cash', async () => {
      // Create another booking for cash payment test
      const bookingRes = await request(app)
        .post('/api/bookings/create-with-questionnaire')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
          serviceDetails: {
            answers: { ac_type: 'Window', issues: ['Complete servicing'], units: 1 },
            estimate: { total: 500 }
          },
          sortPreference: 'nearby',
          location: { lng: 78.4867, lat: 17.3850 }
        });

      const res = await request(app)
        .patch(`/api/bookings/${bookingRes.body.booking._id}/mark-cash-paid`)
        .set('Authorization', `Bearer ${token(customer)}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.paymentStatus).toBe('paid');
      expect(res.body.booking.paymentMethod).toBe('cash');
    });
  });

  describe('5. Tracking Status', () => {
    it('should return tracking information for a booking', async () => {
      const bookingRes = await request(app)
        .post('/api/bookings/create-with-questionnaire')
        .set('Authorization', `Bearer ${token(customer)}`)
        .send({
          serviceCatalogId: acCatalog._id.toString(),
          preferredDateTime: new Date(Date.now() + 86400000).toISOString(),
          serviceDetails: {
            answers: { ac_type: 'Split', issues: ['Gas refilling'], units: 1 },
            estimate: { total: 700 }
          },
          sortPreference: 'rating',
          location: { lng: 78.4867, lat: 17.3850 }
        });

      const res = await request(app)
        .get(`/api/bookings/${bookingRes.body.booking._id}/tracking`)
        .set('Authorization', `Bearer ${token(customer)}`);

      expect(res.status).toBe(200);
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.lat).toBe(17.3850);
      expect(res.body.customer.lng).toBe(78.4867);
    });
  });
});
