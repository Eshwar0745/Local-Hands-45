import request from 'supertest';
import mongoose from 'mongoose';
process.env.NODE_ENV = 'test';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Service from '../src/models/Service.js';
import ServiceTemplate from '../src/models/ServiceTemplate.js';
import Category from '../src/models/Category.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function token(user){ return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret'); }

describe('Booking guards', () => {
  let customer, provider, legacyService, activeService, inactiveService;
  beforeAll(async () => {
    // app.js already handles connection via connectDB()
    // Clean up any existing test data
    await User.deleteMany({ email: { $in: ['cust@test.com', 'prov2@test.com'] } });
    await Service.deleteMany({});
    await ServiceTemplate.deleteMany({});
    await Category.deleteMany({});
    
    customer = await User.create({ name: 'Cust', email: 'cust@test.com', password: await bcrypt.hash('x',10), role: 'customer' });
    provider = await User.create({ name: 'Prov', email: 'prov2@test.com', password: await bcrypt.hash('x',10), role: 'provider' });
    legacyService = await Service.create({ name: 'Legacy', category: 'Old', price: 10, provider: provider._id });
    const cat = await Category.create({ name: 'Home Services'});
    const tplActive = await ServiceTemplate.create({ name: 'General Cleaning', category: cat._id, defaultPrice: 50, active: true });
    const tplInactive = await ServiceTemplate.create({ name: 'Deep Cleaning', category: cat._id, defaultPrice: 100, active: false });
    activeService = await Service.create({ name: tplActive.name, category: 'Home Services', price: tplActive.defaultPrice, provider: provider._id, template: tplActive._id, lockedPrice: true });
    inactiveService = await Service.create({ name: tplInactive.name, category: 'Home Services', price: tplInactive.defaultPrice, provider: provider._id, template: tplInactive._id, lockedPrice: true });
  });
  afterAll(async () => { if (mongoose.connection.readyState) { await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); } });

  it('rejects booking for legacy service', async () => {
    const res = await request(app).post('/api/bookings/create').set('Authorization', `Bearer ${token(customer)}`).send({ serviceId: legacyService._id.toString(), lng:0, lat:0 });
    expect(res.status).toBe(400);
  });
  it('rejects booking for inactive template service', async () => {
    const res = await request(app).post('/api/bookings/create').set('Authorization', `Bearer ${token(customer)}`).send({ serviceId: inactiveService._id.toString(), lng:0, lat:0 });
    expect(res.status).toBe(400);
  });
  it('allows booking for active templated service', async () => {
    const res = await request(app).post('/api/bookings/create').set('Authorization', `Bearer ${token(customer)}`).send({ serviceId: activeService._id.toString(), lng:0, lat:0 });
    expect(res.status).toBe(200);
  });
});