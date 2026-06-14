import request from 'supertest';
import mongoose from 'mongoose';
process.env.NODE_ENV = 'test';
import app from '../src/app.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function tokenFor(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'mySuperSecretKey123!@#', { expiresIn: '1h' });
}

describe('Provider Verification and Work Proof Submission', () => {
  let provider;
  let admin;

  beforeAll(async () => {
    // Wait for Mongoose to connect to avoid test timeouts
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('open', resolve);
      });
    }

    // Clean up
    await User.deleteMany({ email: { $in: ['prov_verify@test.com', 'admin_verify@test.com'] } });

    // Create a provider user
    provider = await User.create({
      name: 'Verify Provider',
      email: 'prov_verify@test.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'provider',
      verified: true,
    });

    // Create an admin user
    admin = await User.create({
      name: 'Verify Admin',
      email: 'admin_verify@test.com',
      password: await bcrypt.hash('pass123', 10),
      role: 'admin',
      verified: true,
    });
  }, 15000); // 15s timeout for db initialization

  afterAll(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('fails submission if workBeforeImage or workAfterImage are missing', async () => {
    const token = tokenFor(provider);
    
    // Missing workAfterImage
    const res1 = await request(app)
      .post('/api/providers/submit-verification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseImage: 'http://cloudinary.com/license.jpg',
        licenseType: 'aadhar',
        licenseNumber: '1234-5678-9012',
        workBeforeImage: 'http://cloudinary.com/before.jpg',
      });
    expect(res1.status).toBe(400);
    expect(res1.body.message).toContain('Work after image is required');

    // Missing workBeforeImage
    const res2 = await request(app)
      .post('/api/providers/submit-verification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseImage: 'http://cloudinary.com/license.jpg',
        licenseType: 'aadhar',
        licenseNumber: '1234-5678-9012',
        workAfterImage: 'http://cloudinary.com/after.jpg',
      });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('Work before image is required');
  });

  it('submits verification successfully with all required details', async () => {
    const token = tokenFor(provider);
    const res = await request(app)
      .post('/api/providers/submit-verification')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseImage: 'http://cloudinary.com/license.jpg',
        licenseType: 'aadhar',
        licenseNumber: '1234-5678-9012',
        workBeforeImage: 'http://cloudinary.com/before.jpg',
        workAfterImage: 'http://cloudinary.com/after.jpg',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('submitted successfully');
    expect(res.body.user.onboardingStatus).toBe('pending');
    expect(res.body.user.workBeforeImage).toBe('http://cloudinary.com/before.jpg');
    expect(res.body.user.workAfterImage).toBe('http://cloudinary.com/after.jpg');
  });

  it('gets pending provider verification details with work images as admin', async () => {
    const adminToken = tokenFor(admin);
    const res = await request(app)
      .get('/api/admin/verifications/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    
    const prov = res.body.providers.find(p => p.email === 'prov_verify@test.com');
    expect(prov).toBeDefined();
    expect(prov.workBeforeImage).toBe('http://cloudinary.com/before.jpg');
    expect(prov.workAfterImage).toBe('http://cloudinary.com/after.jpg');
  });

  it('gets verification status for provider including work images', async () => {
    const token = tokenFor(provider);
    const res = await request(app)
      .get('/api/providers/verification-status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.workBeforeImage).toBe('http://cloudinary.com/before.jpg');
    expect(res.body.workAfterImage).toBe('http://cloudinary.com/after.jpg');
  });
});
