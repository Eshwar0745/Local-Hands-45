import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { ensureAdmin } from './utils/bootstrapAdmin.js';
import { ensureCatalog } from './utils/bootstrapCatalog.js';
import { ensureServiceCatalogsFromTemplates } from './utils/ensureServiceCatalogsFromTemplates.js';

import authRoutes from './routes/authRoutes.js';
import mobileAuthRoutes from './routes/mobileAuthRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ratingsRoutes from './routes/ratingsRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import serviceCatalogRoutes from './routes/serviceCatalogRoutes.js';
import Booking from './models/Booking.js';

dotenv.config();
connectDB().then(async ()=>{
	if (process.env.NODE_ENV !== 'test') {
		await ensureAdmin();
		await ensureCatalog();
		await ensureServiceCatalogsFromTemplates();
	}
});

const app = express();

// CORS configuration - allow both local dev and production Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://local-hands-01.vercel.app',
  'https://localhands-oos4mx2jc-eshwar104515-7127s-projects.vercel.app' // Preview deployments
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in the list OR matches vercel.app domain
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Increase JSON limit to allow base64-embedded work images (lightweight proofs)
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health check routes (must be before other routes for quick response)
app.use('/api', healthRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/mobile-auth', mobileAuthRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-catalogs', serviceCatalogRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/', (_req,res)=>res.send('🚀 LocalHands API (app export)'));

// Background interval: expire global pending bookings after 5 minutes
if (process.env.NODE_ENV !== 'test') {
	setInterval(async () => {
		const now = new Date();
		try {
			const candidates = await Booking.find({ overallStatus: 'pending', pendingExpiresAt: { $lte: now } }).limit(50);
			for (const b of candidates) {
				// If someone accepted in the meantime (safety), skip
				if (b.providerResponses && b.providerResponses.some(r => r.status === 'accepted')) continue;
				b.overallStatus = 'expired';
				b.autoAssignMessage = 'Request expired (no provider accepted in time).';
				await b.save();
				console.log('[booking-expire] Booking %s expired after 5m window', b._id);
			}
		} catch (err) {
			console.error('[booking-expire] error', err.message);
		}
	}, 60 * 1000); // run every minute
}

export default app;