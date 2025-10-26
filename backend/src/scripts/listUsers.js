import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const listUsers = async () => {
  try {
    await connectDB();
    
    const users = await User.find({}).select('name email phone role isEmailVerified');
    
    console.log('\n=== EXISTING USERS IN DATABASE ===\n');
    
    const customers = users.filter(u => u.role === 'customer');
    const providers = users.filter(u => u.role === 'provider');
    const admins = users.filter(u => u.role === 'admin');
    
    if (customers.length > 0) {
      console.log('📱 CUSTOMERS:');
      customers.forEach(u => {
        console.log(`  Name: ${u.name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Phone: ${u.phone || 'N/A'}`);
        console.log(`  Verified: ${u.isEmailVerified ? 'Yes' : 'No'}`);
        console.log('  ---');
      });
    }
    
    if (providers.length > 0) {
      console.log('\n🔧 PROVIDERS:');
      providers.forEach(u => {
        console.log(`  Name: ${u.name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Phone: ${u.phone || 'N/A'}`);
        console.log(`  Verified: ${u.isEmailVerified ? 'Yes' : 'No'}`);
        console.log('  ---');
      });
    }
    
    if (admins.length > 0) {
      console.log('\n👑 ADMINS:');
      admins.forEach(u => {
        console.log(`  Name: ${u.name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Phone: ${u.phone || 'N/A'}`);
        console.log('  ---');
      });
    }
    
    console.log(`\nTotal Users: ${users.length} (${customers.length} customers, ${providers.length} providers, ${admins.length} admins)\n`);
    console.log('💡 Default password for seeded users: pass123\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

listUsers();
