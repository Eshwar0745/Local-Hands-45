/**
 * Health Check Routes for Monitoring and Deployment
 * Used by Render.com and other monitoring tools
 */

import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

/**
 * Basic health check
 * Returns 200 if server is running
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Detailed health check
 * Checks database connection and critical services
 */
router.get('/health/detailed', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'ok',
      database: 'checking',
      socketio: 'ok'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      // Try a simple query to verify database is responsive
      await User.findOne().limit(1);
      healthCheck.services.database = 'ok';
    } else {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'degraded';
    }

    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.services.database = 'error';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

/**
 * Readiness check
 * Returns 200 only when app is fully ready to serve traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        ready: false,
        reason: 'Database not connected'
      });
    }

    // Verify database is responsive
    await User.findOne().limit(1);

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error.message
    });
  }
});

/**
 * Liveness check
 * Returns 200 if process is alive (doesn't check dependencies)
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

export default router;
