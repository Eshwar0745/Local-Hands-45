import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/src/models/User.js';

dotenv.config({ path: './backend/.env' });

async function setPriyaPending() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await User.findOneAndUpdate(
      { email: 'priya.plumbing@test.com' },
      {
        onboardingStatus: 'pending',
        licenseType: 'aadhar',
        licenseNumber: '1234-5678-9012',
        licenseImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', // mockup aadhar image
        workBeforeImage: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', // mockup work before image
        workAfterImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', // mockup work after image
        verificationSubmittedAt: new Date()
      },
      { new: true }
    );

    if (result) {
      console.log('✅ Updated Priya Sharma to pending verification status!');
      console.log(result);
    } else {
      console.log('❌ Priya Sharma not found in the DB.');
    }

    await mongoose.connection.close();
    console.log('🔌 DB connection closed');
  } catch (error) {
    console.error('❌ Error updating DB:', error);
  }
}

setPriyaPending();
