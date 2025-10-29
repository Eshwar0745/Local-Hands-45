import request from 'supertest';
import mongoose from 'mongoose';
process.env.NODE_ENV = 'test';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ServiceTemplate from '../src/models/ServiceTemplate.js';
import Category from '../src/models/Category.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function tokenFor(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
}

describe('Provider select services', () => {
  let provider; let template;
  beforeAll(async () => {
    // app.js already handles connection via connectDB()
    // Clean up any existing test data
    await User.deleteMany({ email: 'prov@test.com' });
    await Category.deleteMany({});
    await ServiceTemplate.deleteMany({});
    
    provider = await User.create({ name: 'Prov', email: 'prov@test.com', password: await bcrypt.hash('pass',10), role: 'provider', verified: true });
  const category = await Category.create({ name: 'TestCat' });
    template = await ServiceTemplate.create({ name: 'Test Service', category: category._id, defaultPrice: 42, active: true });
  });
  afterAll(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });
  it('creates service from template', async () => {
    const token = tokenFor(provider);
    const res = await request(app)
      .post('/api/providers/select-services')
      .set('Authorization', `Bearer ${token}`)
      .send({ templateIds: [template._id.toString()] });
    expect(res.status).toBe(201);
    expect(res.body.services[0].template).toBeDefined();
    expect(res.body.services[0].lockedPrice).toBe(true);
  });
});