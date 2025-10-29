import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Service from '../models/Service.js';
import ServiceTemplate from '../models/ServiceTemplate.js';
import Category from '../models/Category.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';

dotenv.config();

const KMIT_LOCATION = {
  type: 'Point',
  coordinates: [78.5285, 17.4065], // KMIT, Narayanaguda, Hyderabad
  address: 'KMIT, Narayanaguda, Hyderabad, Telangana 500029'
};

// Generate locations at different distances from KMIT
const generateLocation = (distanceKm, angle) => {
  const earthRadius = 6371; // km
  const lat1 = 17.4065 * Math.PI / 180;
  const lon1 = 78.5285 * Math.PI / 180;
  const angularDistance = distanceKm / earthRadius;
  const bearing = angle * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    type: 'Point',
    coordinates: [lon2 * 180 / Math.PI, lat2 * 180 / Math.PI],
    address: `${distanceKm}km from KMIT, Hyderabad`
  };
};

async function seedFinalReviewData() {
  try {
    console.log('🌱 Starting Final Review Seed...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Clean up existing data
    console.log('🧹 Cleaning up existing test data...');
    await User.deleteMany({ 
      $or: [
        { email: 'eshwar@test.com' },
        { email: { $in: [
          'rajesh.ac@test.com',
          'priya.plumbing@test.com',
          'amit.electric@test.com',
          'sneha.cleaning@test.com',
          'karthik.repair@test.com'
        ]}}
      ]
    });
    await Service.deleteMany({
      provider: { $exists: true }
    });
    console.log('✅ Cleanup complete\n');

    // Get service templates
    const acRepairTemplate = await ServiceTemplate.findOne({ name: 'AC Repair & Installation' });
    const plumbingTemplate = await ServiceTemplate.findOne({ name: 'Plumbing' });
    const electricalTemplate = await ServiceTemplate.findOne({ name: 'Electrical' });
    const cleaningTemplate = await ServiceTemplate.findOne({ name: 'House Cleaning' });
    const applianceTemplate = await ServiceTemplate.findOne({ name: 'Refrigerator/Washing Machine Repair' });

    console.log('📋 Service Templates found:');
    console.log(`  - AC Repair & Installation: ${acRepairTemplate?._id}`);
    console.log(`  - Plumbing: ${plumbingTemplate?._id}`);
    console.log(`  - Electrical: ${electricalTemplate?._id}`);
    console.log(`  - House Cleaning: ${cleaningTemplate?._id}`);
    console.log(`  - Appliance Repair: ${applianceTemplate?._id}\n`);

    if (!acRepairTemplate || !plumbingTemplate || !electricalTemplate || !cleaningTemplate || !applianceTemplate) {
      console.error('❌ Some service templates not found. Please run: npm run seed:services');
      process.exit(1);
    }

    // 1. Create Customer: Eshwar
    console.log('👤 Creating Customer: Eshwar...');
    const customer = await User.create({
      name: 'Eshwar',
      email: 'eshwar@test.com',
      phone: '+919876543210',
      password: await bcrypt.hash('password123', 10),
      role: 'customer',
      isVerified: true,
      otpVerified: true,
      location: KMIT_LOCATION,
      address: 'KMIT, Narayanaguda, Hyderabad, Telangana 500029'
    });
    console.log(`✅ Customer created: ${customer.name} (${customer.email})\n`);

    // 2. Create 5 Providers with different services and ratings
    console.log('👷 Creating 5 Providers...\n');

    // Provider 1: Rajesh - AC Repair & Plumbing (2km, 4.8 rating)
    const provider1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh.ac@test.com',
      phone: '+919876543211',
      password: await bcrypt.hash('password123', 10),
      role: 'provider',
      isVerified: true,
      otpVerified: true,
      isAvailable: true,
      onboardingStatus: 'approved',
      location: generateLocation(2, 45),
      address: '2km from KMIT, Hyderabad',
      experience: 8,
      hourlyRate: 350,
      rating: 4.8,
      totalRatings: 156,
      totalEarnings: 45000,
      pendingEarnings: 0,
      withdrawableBalance: 45000,
      verificationStatus: 'verified',
      documents: ['https://example.com/id1.jpg', 'https://example.com/license1.jpg']
    });
    
    // Create services for Rajesh
    await Service.create([
      {
        name: 'AC Repair & Installation',
        category: 'Technology & Appliances',
        price: 500,
        duration: '2 hours',
        rating: 4.8,
        provider: provider1._id,
        template: acRepairTemplate._id,
        lockedPrice: false
      },
      {
        name: 'Plumbing',
        category: 'Home Services',
        price: 400,
        duration: '1-2 hours',
        rating: 4.8,
        provider: provider1._id,
        template: plumbingTemplate._id,
        lockedPrice: false
      }
    ]);
    console.log(`✅ Provider 1: ${provider1.name} - AC Repair & Plumbing (2km, ⭐${provider1.rating})`);

    // Provider 2: Priya - Plumbing & AC Repair (5km, 4.5 rating)
    const provider2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya.plumbing@test.com',
      phone: '+919876543212',
      password: await bcrypt.hash('password123', 10),
      role: 'provider',
      isVerified: true,
      otpVerified: true,
      isAvailable: true,
      onboardingStatus: 'approved',
      location: generateLocation(5, 90),
      address: '5km from KMIT, Hyderabad',
      experience: 5,
      hourlyRate: 300,
      rating: 4.5,
      totalRatings: 89,
      totalEarnings: 28000,
      pendingEarnings: 0,
      withdrawableBalance: 28000,
      verificationStatus: 'verified',
      documents: ['https://example.com/id2.jpg', 'https://example.com/license2.jpg']
    });
    
    await Service.create([
      {
        name: 'Plumbing',
        category: 'Home Services',
        price: 380,
        duration: '1-2 hours',
        rating: 4.5,
        provider: provider2._id,
        template: plumbingTemplate._id,
        lockedPrice: false
      },
      {
        name: 'AC Repair & Installation',
        category: 'Technology & Appliances',
        price: 450,
        duration: '2 hours',
        rating: 4.5,
        provider: provider2._id,
        template: acRepairTemplate._id,
        lockedPrice: false
      }
    ]);
    console.log(`✅ Provider 2: ${provider2.name} - Plumbing & AC Repair (5km, ⭐${provider2.rating})`);

    // Provider 3: Amit - AC Repair & Electrical (8km, 4.7 rating)
    const provider3 = await User.create({
      name: 'Amit Patel',
      email: 'amit.electric@test.com',
      phone: '+919876543213',
      password: await bcrypt.hash('password123', 10),
      role: 'provider',
      isVerified: true,
      otpVerified: true,
      isAvailable: true,
      onboardingStatus: 'approved',
      location: generateLocation(8, 135),
      address: '8km from KMIT, Hyderabad',
      experience: 10,
      hourlyRate: 400,
      rating: 4.7,
      totalRatings: 203,
      totalEarnings: 67000,
      pendingEarnings: 0,
      withdrawableBalance: 67000,
      verificationStatus: 'verified',
      documents: ['https://example.com/id3.jpg', 'https://example.com/license3.jpg']
    });
    
    await Service.create([
      {
        name: 'AC Repair & Installation',
        category: 'Technology & Appliances',
        price: 550,
        duration: '2-3 hours',
        rating: 4.7,
        provider: provider3._id,
        template: acRepairTemplate._id,
        lockedPrice: false
      },
      {
        name: 'Electrical',
        category: 'Home Services',
        price: 450,
        duration: '1-3 hours',
        rating: 4.7,
        provider: provider3._id,
        template: electricalTemplate._id,
        lockedPrice: false
      }
    ]);
    console.log(`✅ Provider 3: ${provider3.name} - AC Repair & Electrical (8km, ⭐${provider3.rating})`);

    // Provider 4: Sneha - Home Cleaning (3km, 4.9 rating)
    const provider4 = await User.create({
      name: 'Sneha Reddy',
      email: 'sneha.cleaning@test.com',
      phone: '+919876543214',
      password: await bcrypt.hash('password123', 10),
      role: 'provider',
      isVerified: true,
      otpVerified: true,
      isAvailable: true,
      onboardingStatus: 'approved',
      location: generateLocation(3, 180),
      address: '3km from KMIT, Hyderabad',
      experience: 4,
      hourlyRate: 250,
      rating: 4.9,
      totalRatings: 127,
      totalEarnings: 34000,
      pendingEarnings: 0,
      withdrawableBalance: 34000,
      verificationStatus: 'verified',
      documents: ['https://example.com/id4.jpg', 'https://example.com/license4.jpg']
    });
    
    await Service.create({
      name: 'House Cleaning',
      category: 'Home Services',
      price: 300,
      duration: '2-4 hours',
      rating: 4.9,
      provider: provider4._id,
      template: cleaningTemplate._id,
      lockedPrice: false
    });
    console.log(`✅ Provider 4: ${provider4.name} - Home Cleaning (3km, ⭐${provider4.rating})`);

    // Provider 5: Karthik - Appliance Repair & Plumbing (6km, 4.6 rating)
    const provider5 = await User.create({
      name: 'Karthik Rao',
      email: 'karthik.repair@test.com',
      phone: '+919876543215',
      password: await bcrypt.hash('password123', 10),
      role: 'provider',
      isVerified: true,
      otpVerified: true,
      isAvailable: true,
      onboardingStatus: 'approved',
      location: generateLocation(6, 225),
      address: '6km from KMIT, Hyderabad',
      experience: 6,
      hourlyRate: 320,
      rating: 4.6,
      totalRatings: 94,
      totalEarnings: 39000,
      pendingEarnings: 0,
      withdrawableBalance: 39000,
      verificationStatus: 'verified',
      documents: ['https://example.com/id5.jpg', 'https://example.com/license5.jpg']
    });
    
    await Service.create([
      {
        name: 'Refrigerator/Washing Machine Repair',
        category: 'Technology & Appliances',
        price: 400,
        duration: '1-2 hours',
        rating: 4.6,
        provider: provider5._id,
        template: applianceTemplate._id,
        lockedPrice: false
      },
      {
        name: 'Plumbing',
        category: 'Home Services',
        price: 360,
        duration: '1-2 hours',
        rating: 4.6,
        provider: provider5._id,
        template: plumbingTemplate._id,
        lockedPrice: false
      }
    ]);
    console.log(`✅ Provider 5: ${provider5.name} - Appliance Repair & Plumbing (6km, ⭐${provider5.rating})\n`);

    // Summary
    console.log('📊 SEED SUMMARY:\n');
    console.log('Customer:');
    console.log(`  ✓ Eshwar (eshwar@test.com) at KMIT, Narayanaguda\n`);
    
    console.log('Providers (sorted by distance from KMIT):');
    console.log(`  1. Rajesh Kumar (2km) - AC Repair, Plumbing - ⭐4.8`);
    console.log(`  2. Sneha Reddy (3km) - Home Cleaning - ⭐4.9`);
    console.log(`  3. Priya Sharma (5km) - Plumbing, AC Repair - ⭐4.5`);
    console.log(`  4. Karthik Rao (6km) - Appliance Repair, Plumbing - ⭐4.6`);
    console.log(`  5. Amit Patel (8km) - AC Repair, Electrical - ⭐4.7\n`);

    console.log('Common Services Analysis:');
    console.log(`  🔧 AC Repair: Rajesh (2km, ⭐4.8), Priya (5km, ⭐4.5), Amit (8km, ⭐4.7)`);
    console.log(`  🚰 Plumbing: Rajesh (2km, ⭐4.8), Priya (5km, ⭐4.5), Karthik (6km, ⭐4.6)\n`);

    console.log('Login Credentials:');
    console.log(`  Customer: eshwar@test.com / password123`);
    console.log(`  Provider 1: rajesh.ac@test.com / password123`);
    console.log(`  Provider 2: priya.plumbing@test.com / password123`);
    console.log(`  Provider 3: amit.electric@test.com / password123`);
    console.log(`  Provider 4: sneha.cleaning@test.com / password123`);
    console.log(`  Provider 5: karthik.repair@test.com / password123\n`);

    console.log('🎯 TESTING SCENARIOS:\n');
    console.log('1. Provider Sorting Test (AC Repair):');
    console.log('   Expected order: Rajesh (2km, ⭐4.8) → Amit (8km, ⭐4.7) → Priya (5km, ⭐4.5)');
    console.log('   Login as Eshwar → Search AC Repair → Verify sorting by distance first\n');

    console.log('2. Common Services Test (Plumbing):');
    console.log('   Expected order: Rajesh (2km, ⭐4.8) → Karthik (6km, ⭐4.6) → Priya (5km, ⭐4.5)');
    console.log('   Login as Eshwar → Search Plumbing → 3 providers should appear\n');

    console.log('3. Full Workflow Test:');
    console.log('   a) Login as Eshwar → Book AC Repair → Select Rajesh');
    console.log('   b) Login as Rajesh → Accept booking → Mark In Progress → Mark Completed');
    console.log('   c) Login as Rajesh → Generate Bill (Service: ₹500, Tax: 18%)');
    console.log('   d) Login as Eshwar → View Bill → Pay (Razorpay or Cash)');
    console.log('   e) Verify: Transaction created, Rajesh earnings updated, History shows payment\n');

    console.log('4. Earnings & History Test:');
    console.log('   a) After payment, login as Rajesh → Check earnings dashboard');
    console.log('   b) Verify total earnings increased by payment amount');
    console.log('   c) Login as Eshwar → Check payment history → Verify transaction appears\n');

    console.log('✨ Seed completed successfully!\n');
    console.log('🚀 Start your backend server and test the flows above for your final review.\n');

    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedFinalReviewData();
