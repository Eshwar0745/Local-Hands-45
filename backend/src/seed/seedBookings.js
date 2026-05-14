import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import Service from '../models/Service.js';

dotenv.config();

// Realistic customer names to duplicate
const realNames = [
  "Ramesh Babu",
  "Ramesh Babu",
  "Suresh Reddy",
  "Suresh Reddy",
  "Anjali Desai",
  "Anjali Desai",
  "Vikram Singh",
  "Pooja Verma",
  "Aditya Nanda",
  "Ramesh Babu"
];

const KMIT_LOCATION = {
  type: 'Point',
  coordinates: [78.5285, 17.4065], 
  address: 'KMIT, Narayanaguda, Hyderabad, Telangana 500029'
};

async function seedRealisticBookings() {
  try {
    console.log('🌱 Starting Realistic Bookings Seed...\n');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // Get providers
    const providers = await User.find({ role: 'provider' });
    if (providers.length === 0) {
      console.log('No providers found. Run seedFinalReview.js first.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create realistic duplicate customers
    const createdCustomers = [];
    for (let i = 0; i < realNames.length; i++) {
        const name = realNames[i];
        const email = `${name.toLowerCase().replace(/\s+/g, '')}${i}@test.com`;
        
        let customer = await User.findOne({ email });
        if (!customer) {
            customer = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'customer',
                phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
                isPhoneVerified: true,
                location: KMIT_LOCATION
            });
        }
        createdCustomers.push(customer);
    }
    
    console.log(`✅ ${createdCustomers.length} duplicate/real customers created.`);

    // Create completed bookings and transactions
    let bookingsCreated = 0;
    
    for (const customer of createdCustomers) {
        // Pick a random provider
        const provider = providers[Math.floor(Math.random() * providers.length)];
        // Pick random service from provider (if they have populated services)
        const providerServices = await Service.find({ provider: provider._id });
        
        if (providerServices.length > 0) {
            const service = providerServices[Math.floor(Math.random() * providerServices.length)];
            const basePrice = service.basePrice || 350;
            const hours = Math.floor(Math.random() * 3) + 1;
            const subtotal = basePrice * hours;
            const platformFee = 50;
            const tax = Math.round(subtotal * 0.18);
            const totalAmount = subtotal + platformFee + tax;
            
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 30)); // 0-30 days ago

            const booking = await Booking.create({
                bookingId: `BKG-${Math.floor(100000 + Math.random() * 900000)}`,
                customer: customer._id,
                provider: provider._id,
                service: service._id,
                status: 'completed',
                location: KMIT_LOCATION,
                scheduledDate: pastDate,
                startTime: '10:00',
                endTime: `${10+hours}:00`,
                billDetails: {
                  subtotal,
                  platformFee,
                  tax,
                  total: totalAmount,
                  materials: []
                },
                paymentStatus: 'paid',
                paymentType: 'online',
                paymentMethod: 'razorpay',
                providerRating: Math.floor(Math.random() * 2) + 4 // 4 or 5
            });

            await Transaction.create({
                booking: booking._id,
                customer: customer._id,
                provider: provider._id,
                amount: totalAmount,
                platformFee: platformFee,
                providerEarning: subtotal + tax,
                type: 'payment',
                status: 'completed',
                paymentMethod: booking.paymentMethod,
                transactionId: `txn_${Math.floor(Math.random()*1000000)}`,
                date: pastDate
            });

            bookingsCreated++;
        }
    }

    console.log(`✅ ${bookingsCreated} past completed bookings with bills & payments created.`);
    console.log('\n✨ Database successfully populated with realistic historical bookings!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
}

seedRealisticBookings();
