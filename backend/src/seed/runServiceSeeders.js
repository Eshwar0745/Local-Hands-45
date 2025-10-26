import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedServiceCatalogs } from './seedServiceCatalog.js';

dotenv.config();

async function runSeeders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');
    
    await seedServiceCatalogs();
    
    console.log('✅ All seeders completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder error:', error);
    process.exit(1);
  }
}

runSeeders();
