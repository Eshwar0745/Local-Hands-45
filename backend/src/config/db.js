import mongoose from "mongoose";
let memoryServer = null;

const connectDB = async () => {
  try {
    // Skip if already connected or connecting
    if (mongoose.connection.readyState >= 1) {
      if (mongoose.connection.readyState === 1) {
        console.log(`✅ MongoDB Already Connected: ${mongoose.connection.host}`);
      }
      return;
    }
    
    let uri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;

    // In test env, if no TEST_MONGO_URI is provided, spin up an in-memory MongoDB
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_MONGO_URI) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      // Check if we already have a memory server
      if (!memoryServer || !global.__MONGO_MEMORY__) {
        memoryServer = await MongoMemoryServer.create();
        uri = memoryServer.getUri();
        // Expose for potential cleanup/debug
        global.__MONGO_MEMORY__ = memoryServer;
      } else {
        memoryServer = global.__MONGO_MEMORY__;
        uri = memoryServer.getUri();
      }
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Best-effort cleanup of memory server on process exit
    const stopMemory = async () => {
      try { if (memoryServer) await memoryServer.stop(); } catch (_) {}
    };
    process.on('exit', stopMemory);
    process.on('SIGINT', async () => { await stopMemory(); process.exit(0); });
    process.on('SIGTERM', async () => { await stopMemory(); process.exit(0); });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    if (process.env.NODE_ENV === 'test') {
      // In tests, bubble up so Jest reports the failure instead of killing the process
      throw err;
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;
