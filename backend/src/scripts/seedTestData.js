/**
 * 🎯 Test Data Seeder for LocalHands
 * Creates realistic test users, services, and bookings
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import dotenv from 'dotenv';

dotenv.config();

// Test users matching the test specification
const testUsers = [
  {
    name: 'Ravi',
    phone: '+919876543210',
    email: 'ravi@test.com',
    role: 'customer',
    location: {
      type: 'Point',
      coordinates: [78.4772, 17.4065] // [lng, lat]
    },
    address: 'Banjara Hills, Hyderabad',
    otpVerified: true,
    rating: 4.5,
    ratingCount: 8
  },
  {
    name: 'Arjun',
    phone: '+919876543211',
    email: 'arjun@test.com',
    role: 'provider',
    location: {
      type: 'Point',
      coordinates: [78.4790, 17.4051]
    },
    address: 'Jubilee Hills, Hyderabad',
    otpVerified: true,
    isAvailable: true,
    rating: 4.8,
    ratingCount: 25,
    completedJobs: 45,
    onboardingStatus: 'approved',
    licenseType: 'Plumbing License',
    licenseNumber: 'PLM12345'
  },
  {
    name: 'Deepak',
    phone: '+919876543212',
    email: 'deepak@test.com',
    role: 'provider',
    location: {
      type: 'Point',
      coordinates: [78.4731, 17.4078]
    },
    address: 'Madhapur, Hyderabad',
    otpVerified: true,
    isAvailable: true,
    rating: 4.6,
    ratingCount: 32,
    completedJobs: 58,
    onboardingStatus: 'approved',
    licenseType: 'Plumbing License',
    licenseNumber: 'PLM12346'
  },
  {
    name: 'Sneha',
    phone: '+919876543213',
    email: 'sneha@test.com',
    role: 'provider',
    location: {
      type: 'Point',
      coordinates: [78.4785, 17.4100]
    },
    address: 'Kondapur, Hyderabad',
    otpVerified: true,
    isAvailable: true,
    rating: 3.9,
    ratingCount: 18,
    completedJobs: 22,
    onboardingStatus: 'approved',
    licenseType: 'Plumbing License',
    licenseNumber: 'PLM12347'
  },
  {
    name: 'Ramesh',
    phone: '+919876543214',
    email: 'ramesh@test.com',
    role: 'provider',
    location: {
      type: 'Point',
      coordinates: [78.4759, 17.4038]
    },
    address: 'Gachibowli, Hyderabad',
    otpVerified: true,
    isAvailable: true,
    rating: 4.2,
    ratingCount: 40,
    completedJobs: 65,
    onboardingStatus: 'approved',
    licenseType: 'Plumbing License',
    licenseNumber: 'PLM12348'
  }
];

// Test services
const testServices = [
  {
    name: 'Plumbing Service',
    description: 'General plumbing repairs and installations',
    price: 500,
    category: 'Home Repair',
    duration: 60,
    isActive: true
  },
  {
    name: 'Emergency Plumbing',
    description: '24/7 emergency plumbing services',
    price: 800,
    category: 'Home Repair',
    duration: 45,
    isActive: true
  },
  {
    name: 'Pipe Installation',
    description: 'New pipe installation and replacement',
    price: 1200,
    category: 'Home Repair',
    duration: 120,
    isActive: true
  }
];

async function seedTestData() {
  try {
    console.log('🌱 Starting test data seeding...');
    
    // Connect to database
    const dbUri = process.env.MONGO_URI;
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing test data
    console.log('🗑️  Clearing existing test data...');
    await User.deleteMany({ phone: /^\+9198765432/ });
    await Service.deleteMany({ name: /Plumbing/i });
    await Booking.deleteMany({});
    await Review.deleteMany({});

    // Create users
    console.log('👥 Creating test users...');
    const createdUsers = await User.insertMany(testUsers);
    console.log(`✅ Created ${createdUsers.length} users:`);
    createdUsers.forEach(u => {
      console.log(`   - ${u.name} (${u.role}) - Rating: ${u.rating || 'N/A'}`);
    });

    // Create services
    console.log('🛠️  Creating test services...');
    const createdServices = await Service.insertMany(testServices);
    console.log(`✅ Created ${createdServices.length} services:`);
    createdServices.forEach(s => {
      console.log(`   - ${s.name} - ₹${s.price}`);
    });

    // Create sample bookings
    console.log('📦 Creating sample bookings...');
    const customer = createdUsers.find(u => u.role === 'customer');
    const providers = createdUsers.filter(u => u.role === 'provider');
    const service = createdServices[0];

    const sampleBookings = [
      {
        customer: customer._id,
        provider: providers[0]._id,
        service: service._id,
        status: 'completed',
        scheduledFor: new Date(Date.now() - 86400000), // Yesterday
        completedAt: new Date(Date.now() - 3600000), // 1 hour ago
        address: customer.address,
        location: customer.location,
        totalAmount: service.price,
        customerRating: 5,
        customerReview: 'Excellent service, very professional!'
      },
      {
        customer: customer._id,
        provider: providers[1]._id,
        service: service._id,
        status: 'accepted',
        scheduledFor: new Date(Date.now() + 7200000), // 2 hours from now
        address: customer.address,
        location: customer.location,
        totalAmount: service.price
      }
    ];

    const createdBookings = await Booking.insertMany(sampleBookings);
    console.log(`✅ Created ${createdBookings.length} bookings`);

    // Create sample reviews
    console.log('⭐ Creating sample reviews...');
    const sampleReviews = [
      {
        booking: createdBookings[0]._id,
        customer: customer._id,
        provider: providers[0]._id,
        rating: 5,
        comment: 'Excellent service, very professional!',
        isPublic: true
      }
    ];

    const createdReviews = await Review.insertMany(sampleReviews);
    console.log(`✅ Created ${createdReviews.length} reviews`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST DATA SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Users: ${createdUsers.length} (1 customer, ${providers.length} providers)`);
    console.log(`   Services: ${createdServices.length}`);
    console.log(`   Bookings: ${createdBookings.length}`);
    console.log(`   Reviews: ${createdReviews.length}`);
    console.log('='.repeat(60));
    console.log('\n🧪 Ready for testing! Run: npm test');

    // Print test credentials
    console.log('\n📱 Test Credentials:');
    console.log('─'.repeat(60));
    createdUsers.forEach(u => {
      console.log(`${u.name.padEnd(10)} | ${u.phone} | ${u.role.padEnd(10)} | Rating: ${(u.rating || 0).toFixed(1)}`);
    });
    console.log('─'.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run seeder
seedTestData();
