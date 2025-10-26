import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function dropServiceIdIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('bookings');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the problematic serviceId index if it exists
    try {
      await collection.dropIndex('serviceId_1');
      console.log('\n✅ Successfully dropped serviceId_1 index');
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log('\n⚠️  serviceId_1 index not found (might already be dropped)');
      } else {
        throw err;
      }
    }

    // List indexes after dropping
    const indexesAfter = await collection.indexes();
    console.log('\n📋 Indexes after cleanup:');
    indexesAfter.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropServiceIdIndex();
