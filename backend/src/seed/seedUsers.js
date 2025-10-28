import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const seedUsers = async () => {
  try {
    await connectDB();

    // Clear existing customers and providers
    await User.deleteMany({ role: { $in: ["customer", "provider"] } });

    // Define demo customers
    const customers = [
      {
        name: "Aarav Customer",
        email: "aarav@test.com",
        password: await bcrypt.hash("pass123", 10),
        role: "customer",
        phone: "9991112222",
        location: {
          type: "Point",
          coordinates: [78.4867, 17.3850] // Hyderabad coordinates
        }
      },
      {
        name: "Riya Customer",
        email: "riya@test.com",
        password: await bcrypt.hash("pass123", 10),
        role: "customer",
        phone: "9992223333",
        location: {
          type: "Point",
          coordinates: [78.4867, 17.3850]
        }
      }
    ];

    // Define providers with specific ratings and locations
    const providers = [
      {
        name: "AC Provider 1",
        email: "provider.ac1@test.com",
        password: await bcrypt.hash("pass123", 10),
        role: "provider",
        phone: "9993334444",
        rating: 4.8,
        ratingCount: 50,
        priceLevel: "low",
        isAvailable: true,
        isApproved: true,
        location: {
          type: "Point",
          coordinates: [78.4890, 17.3860] // ~2km from customer
        },
        locationUpdatedAt: new Date(),
        services: ["AC Repair & Installation"]
      },
      {
        name: "AC Provider 2",
        email: "provider.ac2@test.com",
        password: await bcrypt.hash("pass123", 10),
        role: "provider",
        phone: "9994445555",
        rating: 4.2,
        ratingCount: 35,
        priceLevel: "medium",
        isAvailable: true,
        isApproved: true,
        location: {
          type: "Point",
          coordinates: [78.5067, 17.3950] // ~6km from customer
        },
        locationUpdatedAt: new Date(),
        services: ["AC Repair & Installation"]
      },
      {
        name: "AC Provider 3",
        email: "provider.ac3@test.com",
        password: await bcrypt.hash("pass123", 10),
        role: "provider",
        phone: "9995556666",
        rating: 3.6,
        ratingCount: 20,
        priceLevel: "lowest",
        isAvailable: true,
        isApproved: true,
        location: {
          type: "Point",
          coordinates: [78.5267, 17.4050] // ~10km from customer
        },
        locationUpdatedAt: new Date(),
        services: ["AC Repair & Installation"]
      }
    ];

    // Insert customers and providers into DB
    await User.insertMany([...customers, ...providers]);

    console.log("✅ Demo customers and providers seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err.message);
    process.exit(1);
  }
};

seedUsers();
