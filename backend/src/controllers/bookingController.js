import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import ServiceTemplate from '../models/ServiceTemplate.js';
import ServiceCatalog from '../models/ServiceCatalog.js';
import { nextBookingId } from "../utils/generateId.js";
import Review from "../models/Review.js";
import mongoose from 'mongoose';

// Customer creates booking request at location
export const createBooking = async (req, res) => {
  try {
    const { serviceId, lng, lat, scheduledAt } = req.body;
    if (!serviceId || typeof lng !== "number" || typeof lat !== "number")
      return res.status(400).json({ message: "serviceId, lng, lat required" });

  const service = await Service.findById(serviceId).populate('template');
    if (!service) return res.status(404).json({ message: "Service not found" });
  if (!service.template) return res.status(400).json({ message: 'Service not available (legacy/disabled)' });
  if (service.template && service.template.active === false) return res.status(400).json({ message: 'Service template inactive' });

    const bookingId = await nextBookingId();

    const booking = await Booking.create({
      bookingId,
      customer: req.userId,
      service: service._id,
      provider: service.provider || undefined, // assign owning provider so they can see it
  location: { type: "Point", coordinates: [lng, lat] },
  scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: "requested",
      paymentStatus: "pending"
    });

    res.json({ booking });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Multi-provider booking creation based on template (aggregated service selection)
// ✅ Offer timeout: 2 minutes (120 seconds) per provider for demo
const OFFER_TIMEOUT_MS = 120 * 1000; // 2 minutes

async function computeProviderExperience(providerId) {
  const user = await User.findById(providerId).select('completedJobs');
  return user?.completedJobs || 0;
}

export const createBookingMulti = async (req, res) => {
  try {
    const { templateId, lng, lat, scheduledAt } = req.body;
    if (!templateId || typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ message: 'templateId, lng, lat required' });
    }
    const template = await ServiceTemplate.findById(templateId);
    if(!template) return res.status(404).json({ message: 'Template not found' });
    if(template.active === false) return res.status(400).json({ message: 'Template inactive' });

    // Find services offering this template and providers who are live
    const services = await Service.find({ template: template._id }).populate('provider','name rating ratingCount isAvailable');
    // Re-validate availability from Users collection (avoid stale populated doc cache)
    const liveServices = [];
    for(const s of services){
      if(!s.provider) continue;
      const fresh = await User.findById(s.provider._id).select('isAvailable rating ratingCount');
      if(fresh && fresh.isAvailable) {
        // sync fresh availability
        s.provider.isAvailable = true;
        liveServices.push(s);
      }
    }
    if(liveServices.length === 0) {
      return res.status(400).json({ message: 'No live providers available for this service right now' });
    }

    // Rank: rating desc then experience desc then createdAt asc (as tiebreak via provider _id)
    const ranked = [];
    for(const s of liveServices){
      const exp = await computeProviderExperience(s.provider._id);
      ranked.push({ service: s, provider: s.provider, rating: s.provider.rating || 0, experience: exp });
    }
    ranked.sort((a,b)=>{
      if(b.rating !== a.rating) return b.rating - a.rating;
      if(b.experience !== a.experience) return b.experience - a.experience;
      return a.provider._id.toString().localeCompare(b.provider._id.toString());
    });

    const bookingId = await nextBookingId();
    const now = new Date();
    const first = ranked[0];
    const queue = ranked.slice(1).map(r=>r.provider._id);

    const booking = await Booking.create({
      bookingId,
      customer: req.userId,
      service: first.service._id, // initial service (may change if next provider selected)
      provider: undefined, // not assigned until accepted
      serviceTemplate: template._id,
      location: { type: 'Point', coordinates: [lng, lat] },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status: 'requested',
      overallStatus: 'pending',
      paymentStatus: 'pending',
      pendingProviders: queue,
      offers: [{ provider: first.provider._id, status: 'pending', offeredAt: now }],
      providerResponseTimeout: new Date(now.getTime() + OFFER_TIMEOUT_MS),
      autoAssignMessage: 'Searching for best available provider...'
      ,pendingExpiresAt: new Date(now.getTime() + 5*60*1000) // 5 minute global visibility window
    });

    return res.json({ booking, message: 'Request sent. The best available provider will be assigned shortly.' });
  } catch(e){
    res.status(500).json({ message: e.message });
  }
};

async function advanceOffer(booking){
  try {
    if(!booking) return;
    if(!Array.isArray(booking.offers)) booking.offers = [];
    if(!Array.isArray(booking.pendingProviders)) booking.pendingProviders = [];
    // Keep pulling from queue until we find a provider who is still available
    while(booking.pendingProviders && booking.pendingProviders.length > 0){
      const nextProviderId = booking.pendingProviders.shift();
      if(!nextProviderId) continue;
      const prov = await User.findById(nextProviderId).select('isAvailable');
      if(prov && prov.isAvailable){
        booking.offers.push({ provider: nextProviderId, status: 'pending', offeredAt: new Date() });
        booking.providerResponseTimeout = new Date(Date.now() + OFFER_TIMEOUT_MS);
        await booking.save();
        return; // scheduled new offer
      }
      // else skip silently and continue
    }
    // Queue exhausted or no live providers
    booking.providerResponseTimeout = undefined;
    if(!booking.offers.find(o=>o.status==='pending')){
      booking.autoAssignMessage = 'No live providers currently available.';
    }
    await booking.save();
  } catch(err){
    console.error('[advanceOffer] error', err);
    throw err;
  }
}

async function expireIfNeeded(booking){
  if(!booking.offers || booking.offers.length === 0) return;
  const current = booking.offers.find(o=>o.status === 'pending');
  if(!current) return; // nothing pending
  if(booking.providerResponseTimeout && booking.providerResponseTimeout < new Date()){
    current.status = 'expired';
    current.respondedAt = new Date();
    await advanceOffer(booking);
  }
}

export const acceptOffer = async (req,res)=>{
  try {
    const { id } = req.params; // booking id
    const booking = await Booking.findById(id).populate('service');
    if(!booking) return res.status(404).json({ message: 'Not found' });
    if(booking.status !== 'requested') return res.status(400).json({ message: 'Cannot accept now' });
    await expireIfNeeded(booking);
    const pending = booking.offers.find(o=>o.status==='pending');
    if(!pending || pending.provider.toString() !== req.userId) return res.status(403).json({ message: 'No active offer for you' });
    // Assign
  pending.status = 'accepted'; // offer itself marked accepted
  pending.respondedAt = new Date();
  // Immediately move booking into in_progress (was previously 'accepted') so provider can mark complete
  booking.status = 'in_progress';
    booking.provider = pending.provider;
    booking.acceptedAt = new Date();
    booking.pendingProviders = [];
    booking.providerResponseTimeout = undefined;
    booking.autoAssignMessage = undefined;
    await booking.save();
    
    // ✅ AUTO-PAUSE GO LIVE: Turn off provider's availability during service
    await User.findByIdAndUpdate(req.userId, {
      isAvailable: false,
      isLiveTracking: false
    });
    
    res.json({ booking });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

export const declineOffer = async (req,res)=>{
  try {
    console.log('[declineOffer] incoming', req.params.id, 'user', req.userId);
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking id', id });
    }
    const booking = await Booking.findById(id);
    if(!booking) return res.status(404).json({ message: 'Not found' });
    if(booking.status !== 'requested') return res.status(400).json({ message: 'Cannot decline now' });
    await expireIfNeeded(booking);
    if(!Array.isArray(booking.offers)) {
      console.error('[declineOffer] booking.offers not array', booking._id);
      return res.status(400).json({ message: 'No offers present' });
    }
    const pending = booking.offers.find(o=>o.status==='pending');
    if(!pending){
      console.warn('[declineOffer] no pending offer', booking._id, booking.offers.map(o=>({p:o.provider, s:o.status})));
      return res.status(403).json({ message: 'No active offer for you' });
    }
    if(!pending.provider){
      console.error('[declineOffer] pending offer missing provider', booking._id, pending);
      return res.status(400).json({ message: 'Offer corrupted (provider missing)' });
    }
    if(pending.provider.toString() !== req.userId){
      console.warn('[declineOffer] provider mismatch', { booking: booking._id, expected: pending.provider.toString(), got: req.userId });
      return res.status(403).json({ message: 'No active offer for you' });
    }
    pending.status = 'declined';
    pending.respondedAt = new Date();
    await advanceOffer(booking);
    res.json({ booking });
  } catch(e){
    console.error('[declineOffer] error', e.stack || e);
    res.status(500).json({ message: 'Internal error declining offer', error: e.message, stack: e.stack });
  }
};

export const myOffers = async (req,res)=>{
  try {
    // Providers only
    const myProviderId = req.userId;
    console.log('🔍 Fetching offers for provider:', myProviderId, '(last 6 chars:', myProviderId.toString().slice(-6) + ')');
    
    // First, let's see ALL recent bookings regardless of status
    const allRecent = await Booking.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('bookingId status offers.provider offers.status createdAt')
      .lean();
    
    console.log('📊 Recent bookings (any status):', allRecent.map(b => ({
      id: b.bookingId,
      status: b.status,
      created: b.createdAt,
      offersCount: b.offers?.length || 0,
      providers: b.offers?.map(o => o.provider?.toString().slice(-6)) || []
    })));
    
    // Find bookings with status 'requested' that have an offer for this provider
    const offers = await Booking.find({ 
      status: 'requested', 
      'offers.provider': myProviderId 
    })
      .select('bookingId offers providerResponseTimeout serviceTemplate serviceCatalog service status')
      .populate('service')
      .populate('serviceTemplate','name')
      .populate('serviceCatalog', 'name')
      .lean();
    
    console.log('📋 Found bookings with status=requested and my offer:', offers.map(b => ({
      id: b.bookingId,
      status: b.status,
      offersCount: b.offers?.length,
      offers: b.offers?.map(o => ({ 
        provider: o.provider.toString().slice(-6), 
        status: o.status,
        isMe: o.provider.toString() === myProviderId.toString()
      }))
    })));
    
    const now = new Date();
    const mine = offers.filter(b=>{
      const current = b.offers.find(o=>o.status==='pending');
      const isForMe = current && current.provider.toString() === myProviderId.toString();
      if (current && !isForMe) {
        console.log(`⏭️ Skipping ${b.bookingId} - pending offer is for different provider`);
      }
      return isForMe;
    }).map(b=>({
      _id: b._id,
      bookingId: b.bookingId,
      serviceTemplate: b.serviceTemplate,
      serviceCatalog: b.serviceCatalog,
      service: b.service,
      timeoutAt: b.providerResponseTimeout,
    }));
    
    console.log('✅ Filtered offers for this provider:', mine.map(m => m.bookingId));
    
    res.json({ offers: mine, now });
  } catch(e){ 
    console.error('❌ Error in myOffers:', e);
    res.status(500).json({ message: e.message }); 
  }
};

// New: provider-visible pending bookings excluding those they rejected or accepted
export const providerAvailableBookings = async (req,res)=>{
  try {
    const providerId = req.userId;
    // Criteria: overallStatus pending, no accepted providerResponses, and either
    //   - no providerResponses for this provider
    //   - or providerResponses for this provider is not rejected
    const query = {
      overallStatus: 'pending',
      $and: [
        { 'providerResponses': { $not: { $elemMatch: { status: 'accepted' } } } },
        { 'providerResponses': { $not: { $elemMatch: { providerId: providerId, status: { $in: ['rejected','accepted'] } } } } }
      ]
    };
    const bookings = await Booking.find(query).select('bookingId serviceTemplate service customer createdAt providerResponses overallStatus').populate('serviceTemplate','name').populate('service','name');
    res.json({ bookings });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// Admin debug: force advance current pending offer (skip it) – for QA only
export const forceAdvanceOffer = async (req,res)=>{
  try {
    if(req.userRole !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if(!booking) return res.status(404).json({ message: 'Not found' });
    if(booking.status !== 'requested') return res.status(400).json({ message: 'Booking not in requested state' });
    const current = booking.offers.find(o=>o.status==='pending');
    if(current){
      current.status='expired';
      current.respondedAt=new Date();
    }
    await advanceOffer(booking);
    res.json({ booking });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// Provider accepts a booking
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params; // booking _id
    const provider = await User.findById(req.userId);
    if (!provider || provider.role !== "provider")
      return res.status(403).json({ message: "Only providers can accept" });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    // New logic: if overallStatus exists use it; fallback to legacy status
    if (booking.overallStatus) {
      if (booking.overallStatus !== 'pending') {
        return res.status(400).json({ message: 'Cannot accept this booking' });
      }
      // Prevent multiple acceptances
      if (booking.providerResponses?.some(r=>r.status==='accepted')) {
        return res.status(400).json({ message: 'Already accepted by another provider' });
      }
      // Check if current provider previously rejected it
      if (booking.providerResponses?.some(r=>r.providerId.toString()===provider._id.toString() && r.status==='rejected')) {
        return res.status(403).json({ message: 'You already rejected this request' });
      }
    } else if (booking.status !== 'requested') {
      return res.status(400).json({ message: 'Cannot accept this booking' });
    }

    // Multi-provider flow: if offers exist, mirror acceptOffer logic
    if (booking.offers && booking.offers.length > 0) {
      await expireIfNeeded(booking);
      const pending = booking.offers.find(o=>o.status==='pending');
      if(!pending || pending.provider.toString() !== req.userId) {
        return res.status(403).json({ message: 'No active offer for you' });
      }
      pending.status = 'accepted';
      pending.respondedAt = new Date();
  booking.status = 'in_progress';
      booking.provider = pending.provider;
      booking.acceptedAt = new Date();
      booking.pendingProviders = [];
      booking.providerResponseTimeout = undefined;
      booking.autoAssignMessage = undefined;
      await booking.save();
      
      // ✅ AUTO-PAUSE GO LIVE: Turn off provider's availability during service
      await User.findByIdAndUpdate(req.userId, {
        isAvailable: false,
        isLiveTracking: false
      });
      
      return res.json({ booking, mode: 'multi', action: 'offer-accepted' });
    }

    // New providerResponses path if overallStatus used
    if (booking.overallStatus) {
      if(!Array.isArray(booking.providerResponses)) booking.providerResponses = [];
      booking.providerResponses.push({ providerId: provider._id, status: 'accepted', respondedAt: new Date() });
      booking.overallStatus = 'in-progress';
      booking.status = 'in_progress'; // keep legacy field synchronized
      booking.provider = provider._id;
      booking.acceptedAt = new Date();
      await booking.save();
      
      // ✅ AUTO-PAUSE GO LIVE: Turn off provider's availability during service
      await User.findByIdAndUpdate(req.userId, {
        isAvailable: false,
        isLiveTracking: false
      });
      
      console.log('[service] Provider %s accepted request %s (now in-progress)', provider._id, booking._id);
      return res.json({ booking, mode: 'providerResponses', action: 'accepted' });
    }

    // Legacy single-provider path (no overallStatus field yet)
    if (booking.provider && booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({ message: 'You are not the owner provider for this service' });
    }
    booking.status = 'in_progress';
    booking.provider = provider._id;
    booking.acceptedAt = new Date();
    await booking.save();
    
    // ✅ AUTO-PAUSE GO LIVE: Turn off provider's availability during service
    await User.findByIdAndUpdate(req.userId, {
      isAvailable: false,
      isLiveTracking: false
    });
    
    res.json({ booking, mode: 'legacy' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Provider rejects a booking
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = (req.body && typeof req.body.reason === 'string') ? req.body.reason : '';
    if(!req.body) {
      console.warn('[rejectBooking] req.body was undefined (no JSON payload sent). Defaulting reason to empty string.');
    }
    console.log('[rejectBooking] incoming id=%s reason="%s" user=%s', id, reason, req.userId);
    const provider = await User.findById(req.userId);
    if (!provider || provider.role !== "provider")
      return res.status(403).json({ message: "Only providers can reject" });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    console.log('[rejectBooking] booking.status=%s offers=%d overallStatus=%s', booking.status, booking.offers?.length || 0, booking.overallStatus);
    if (booking.overallStatus) {
      if (booking.overallStatus !== 'pending') {
        return res.status(400).json({ message: 'Cannot reject this booking' });
      }
      // If provider already accepted or rejected, enforce idempotency
      const existing = booking.providerResponses?.find(r=>r.providerId.toString()===provider._id.toString());
      if (existing && existing.status === 'rejected') {
        return res.status(200).json({ booking, message: 'Already rejected', mode: 'providerResponses', action: 'already-rejected' });
      }
      if (existing && existing.status === 'accepted') {
        return res.status(400).json({ message: 'You already accepted this booking' });
      }
    } else if (booking.status !== 'requested') {
      return res.status(400).json({ message: 'Cannot reject this booking' });
    }

    // Multi-provider adaptation: decline current offer only (do not mark whole booking rejected yet)
    if (booking.offers && booking.offers.length > 0) {
      await expireIfNeeded(booking);
      const pending = booking.offers.find(o=>o.status==='pending');
      if(!pending || pending.provider.toString() !== req.userId) {
        return res.status(403).json({ message: 'No active offer for you' });
      }
      pending.status = 'declined';
      pending.respondedAt = new Date();
      await advanceOffer(booking);
      console.log('[rejectBooking] multi decline done -> next offer count pending=%d', booking.offers.filter(o=>o.status==='pending').length);
      return res.json({ booking, mode: 'multi', action: 'offer-declined' });
    }

    // If overallStatus mode active, record only provider-specific rejection
    if (booking.overallStatus) {
      if(!Array.isArray(booking.providerResponses)) booking.providerResponses = [];
      const existing = booking.providerResponses.find(r=>r.providerId.toString()===provider._id.toString());
      if (existing) {
        existing.status = 'rejected';
        existing.respondedAt = new Date();
      } else {
        booking.providerResponses.push({ providerId: provider._id, status: 'rejected', respondedAt: new Date() });
      }
      booking.rejectionReason = reason; // last rejection reason; could be extended to array later
      await booking.save();
      console.log('[service] Provider %s rejected request %s', provider._id, booking._id);
      console.log('[service] Remaining visible for other providers');
      return res.json({ booking, mode: 'providerResponses', action: 'rejected' });
    }

    // Legacy path: mark entire booking rejected
    booking.status = 'rejected';
    booking.provider = provider._id;
    booking.rejectionReason = reason;
    await booking.save();
    console.log('[rejectBooking] legacy rejected booking %s saved', booking._id);
    res.json({ booking, mode: 'legacy' });
  } catch (e) {
    console.error('[rejectBooking] error', e);
    res.status(500).json({ message: 'Internal error rejecting booking', error: e.message });
  }
};

// Live tracking status for a booking (customer/provider only)
export const getTrackingStatus = async (req, res) => {
  try {
    const { id } = req.params; // booking _id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const booking = await Booking.findById(id)
      .select('bookingId customer provider location providerLocation providerLastUpdate distanceFromCustomer status')
      .lean();
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Privacy: only the customer or the assigned provider can view tracking
    const uid = String(req.userId);
    const isCustomer = booking.customer && String(booking.customer) === uid;
    const isProvider = booking.provider && String(booking.provider) === uid;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ message: 'Not authorized to view this tracking info' });
    }

    const now = Date.now();
    const last = booking.providerLastUpdate ? new Date(booking.providerLastUpdate).getTime() : 0;
    const stale = !last || now - last > 30 * 1000; // 30s without update considered stale

    // Compute distance & ETA if both locations present
    let distanceKm = booking.distanceFromCustomer || null;
    let etaMinutes = null;
    let providerPoint = booking.providerLocation; // GeoJSON Point or undefined
    const hasCustomer = booking.location?.coordinates?.length === 2;

    // Fallback: if booking.providerLocation missing, use provider's current User.location
    if ((!providerPoint || !providerPoint.coordinates || providerPoint.coordinates.length !== 2) && booking.provider) {
      const prov = await User.findById(booking.provider).select('location updatedAt');
      if (prov?.location?.coordinates?.length === 2) {
        providerPoint = prov.location;
      }
    }

    const hasProvider = providerPoint?.coordinates?.length === 2;
    if (hasProvider && hasCustomer) {
      const [plng, plat] = providerPoint.coordinates;
      const [clng, clat] = booking.location.coordinates;
      const R = 6371;
      const dLat = ((clat - plat) * Math.PI) / 180;
      const dLng = ((clng - plng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((plat * Math.PI) / 180) * Math.cos((clat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Number((R * c).toFixed(2));
    }

    if (distanceKm != null) {
      const avgSpeedKmH = 20; // Assumed urban speed
      etaMinutes = Math.max(1, Math.ceil((distanceKm / avgSpeedKmH) * 60));
    }

    return res.json({
      bookingId: booking.bookingId,
      status: booking.status,
      provider: hasProvider
        ? { lat: providerPoint.coordinates[1], lng: providerPoint.coordinates[0], lastUpdate: booking.providerLastUpdate }
        : null,
      customer: hasCustomer
        ? { lat: booking.location.coordinates[1], lng: booking.location.coordinates[0] }
        : null,
      stale,
      distanceKm,
      etaMinutes,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Provider marks booking completed
export const completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    // Allow legacy 'accepted' (from older releases) OR modern 'in_progress'
    if (!['in_progress','accepted'].includes(booking.status)) {
      return res.status(400).json({ message: "Only in_progress bookings can be completed" });
    }
    if (!booking.provider || booking.provider.toString() !== req.userId) return res.status(403).json({ message: "Not your booking" });
    booking.status = "completed";
    booking.completedAt = new Date();
    booking.reviewStatus = "provider_pending"; // Customer needs to review first
    
    // ✅ AUTO-GENERATE BILL FROM ESTIMATE
    if (booking.serviceDetails?.estimate && !booking.billDetails) {
      const estimate = booking.serviceDetails.estimate;
      
      // Extract all estimate components
      const serviceCharges = Number(estimate.serviceCharge) || 0;
      const visitCharge = Number(estimate.visitCharge) || 0;
      const platformFee = Number(estimate.platformFee) || 0;
      const subtotal = Number(estimate.subtotal) || (serviceCharges + visitCharge);
      const total = Number(estimate.total) || (subtotal + platformFee);
      
      booking.billDetails = {
        serviceCharges: serviceCharges,
        extraFees: visitCharge,
        discount: 0,
        tax: 0,
        subtotal: subtotal,
        total: total,
        notes: `Bill generated from initial estimate for ${estimate.breakdown?.serviceName || booking.serviceCatalog?.name || 'Service'}. Original estimate provided to customer: ₹${total}`,
        generatedAt: new Date(),
        generatedBy: req.userId
      };
      booking.paymentStatus = "billed";
      
      console.log('📋 Bill auto-generated from estimate:', { 
        bookingId: booking.bookingId, 
        serviceCharges,
        visitCharge,
        platformFee,
        subtotal,
        total,
        originalEstimate: estimate
      });
    } else if (!booking.billDetails) {
      // If no estimate exists, log warning
      console.warn('⚠️ No estimate found for booking:', booking.bookingId, 'Bill not auto-generated');
    }
    
    await booking.save();
    
    // ✅ POST-SERVICE LOCATION UPDATE: Update provider's location to customer's booking location
    if (booking.provider && booking.location) {
      await User.findByIdAndUpdate(booking.provider, {
        location: booking.location,
        lastServiceLocation: booking.location,
        lastServiceCompletedAt: new Date()
      });
    }
    
    // increment provider completedJobs counter (denormalized experience metric)
    if(booking.provider){
      await User.findByIdAndUpdate(booking.provider, { $inc: { completedJobs: 1 } });
    }
    
    // Update provider's pending earnings if bill was generated
    if (booking.billDetails) {
      await User.findByIdAndUpdate(booking.provider, {
        $inc: { pendingEarnings: booking.billDetails.total }
      });
    }
    
    res.json({ 
      booking, 
      needsReview: true, 
      reviewerRole: "provider", 
      waitingFor: "customer",
      billGenerated: !!booking.billDetails,
      billDetails: booking.billDetails 
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// Customer cancels a booking (before completion)
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    if (booking.customer.toString() !== req.userId) return res.status(403).json({ message: "Not your booking" });
  if (!["requested", "in_progress", "accepted"].includes(booking.status)) return res.status(400).json({ message: "Cannot cancel at this stage" });
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();
    res.json({ booking });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// Customer marks booking completed (alternative flow) if provider already accepted
export const customerCompleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if(!booking) return res.status(404).json({ message: 'Not found' });
    if(booking.customer.toString() !== req.userId) return res.status(403).json({ message: 'Not your booking' });
    if(booking.status !== 'in_progress') return res.status(400).json({ message: 'Only in_progress bookings can be completed' });
    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.reviewStatus = 'customer_pending'; // Provider needs to review first
    await booking.save();
    
    // ✅ POST-SERVICE LOCATION UPDATE: Update provider's location to customer's booking location
    if (booking.provider && booking.location) {
      await User.findByIdAndUpdate(booking.provider, {
        location: booking.location,
        lastServiceLocation: booking.location,
        lastServiceCompletedAt: new Date()
      });
    }
    
    if(booking.provider){
      await User.findByIdAndUpdate(booking.provider, { $inc: { completedJobs: 1 } });
    }
    res.json({ booking, completedBy: 'customer', needsReview: true, reviewerRole: 'customer', waitingFor: 'provider' });
  } catch(e){ res.status(500).json({ message: e.message }); }
};

// List bookings for current user (role-aware)
export const myBookings = async (req, res) => {
  try {
    if (req.userRole === "customer") {
      const list = await Booking.find({ customer: req.userId })
        .populate({ path: "service", populate: { path: "provider", select: "_id" } })
        .populate("provider", "name rating ratingCount completedJobs")
        .populate('serviceTemplate','name')
        .sort("-createdAt");
      // attach review linkage if completed
      const enriched = await Promise.all(list.map(async b => {
        if (b.status === 'completed') {
          // find reviews for booking (both directions)
          const revs = await Review.find({ booking: b._id }).select('direction rating comment createdAt');
          return { ...b.toObject(), reviews: revs };
        }
        return b;
      }));
      return res.json({ bookings: enriched });
    }
    if (req.userRole === "provider") {
        const providerId = req.userId;
        // wider candidate set: explicit provider, any offer to provider, or unassigned (legacy) for potential service ownership filtering
        const candidates = await Booking.find({
          $or: [
            { provider: providerId },
            { 'offers.provider': providerId },
            { provider: { $exists: false } },
            { provider: null }
          ]
        })
        .populate({ path: 'service', populate: { path: 'provider', select: '_id' } })
        .populate('customer','name')
        .populate('serviceTemplate','name')
        .sort('-createdAt');

        const list = candidates.filter(b => {
          if (b.provider && b.provider.toString() === providerId) return true; // assigned to me
          const serviceOwner = b.service && b.service.provider && b.service.provider._id ? b.service.provider._id.toString() : (b.service && b.service.provider && b.service.provider.toString());
            // show if I was initial service owner (legacy pre-offer model)
          if (!b.provider && serviceOwner === providerId) return true;
          // show if I had (or have) any offer in offers array
          if (b.offers && b.offers.some(o=> o.provider && o.provider.toString() === providerId)) return true;
          return false;
        });

        const enriched = await Promise.all(list.map(async b => {
          const obj = b.toObject();
          // Determine this provider's offer status (latest offer occurrence)
          if (obj.offers && obj.offers.length) {
            const mine = [...obj.offers].reverse().find(o=> o.provider && o.provider.toString() === providerId);
            if (mine) obj.providerOfferStatus = mine.status; // pending|declined|accepted|expired
          }
          if (b.status === 'completed') {
            const revs = await Review.find({ booking: b._id }).select('direction rating comment createdAt');
            obj.reviews = revs;
          }
          return obj;
        }));
        return res.json({ bookings: enriched });
    }
    return res.status(400).json({ message: "Unsupported role" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Debug: show offers queue and pending providers for a booking
export const getBookingOffersDebug = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }
    const booking = await Booking.findById(id)
      .populate('offers.provider', 'name rating isAvailable')
      .populate('pendingProviders', 'name rating isAvailable')
      .populate('serviceTemplate','name')
      .populate('serviceCatalog','name category')
      .lean();
    if (!booking) return res.status(404).json({ message: 'Not found' });

    // Allow only owner customer or admin to view
    const isOwner = booking.customer && String(booking.customer) === String(req.userId);
    if (!isOwner && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const now = Date.now();
    const timeout = booking.providerResponseTimeout ? new Date(booking.providerResponseTimeout).getTime() : null;
    const secondsLeft = timeout ? Math.max(0, Math.ceil((timeout - now)/1000)) : null;
    const currentPending = (booking.offers || []).find(o => o.status === 'pending');

    return res.json({
      booking: {
        id: booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        serviceTemplate: booking.serviceTemplate,
        serviceCatalog: booking.serviceCatalog,
        sortPreference: booking.sortPreference,
      },
      offers: booking.offers || [],
      pendingProviders: booking.pendingProviders || [],
      autoAssignMessage: booking.autoAssignMessage || null,
      providerResponseTimeout: booking.providerResponseTimeout || null,
      secondsLeft,
      currentPendingProvider: currentPending?.provider || null,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Debug: recompute candidate providers for this booking context
export const getBookingCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }
    const booking = await Booking.findById(id).select('customer location sortPreference serviceCatalog').lean();
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const isOwner = booking.customer && String(booking.customer) === String(req.userId);
    if (!isOwner && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const catalog = await ServiceCatalog.findById(booking.serviceCatalog).lean();
    if (!catalog) return res.status(400).json({ message: 'Service catalog not found on booking' });

    const [lng, lat] = booking.location?.coordinates || [];
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ message: 'Booking location missing' });
    }

    const safeName = catalog.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '.');
    const nameRegex = new RegExp(safeName, 'i');
    const services = await Service.find({
      $or: [
        { name: { $regex: nameRegex } },
        { category: { $regex: new RegExp(`^${catalog.category}$`, 'i') } }
      ]
    }).populate('provider','name rating ratingCount isAvailable location');

    const distKm = (lng1, lat1, lng2, lat2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const allOnline = [];
    for (const s of services) {
      if (!s.provider || !s.provider.isAvailable) continue;
      const coords = Array.isArray(s.provider.location?.coordinates) ? s.provider.location.coordinates : [null, null];
      const [plng, plat] = coords;
      if (typeof plng !== 'number' || typeof plat !== 'number') continue;
      const distanceKm = distKm(lng, lat, plng, plat);
      allOnline.push({
        providerId: s.provider._id,
        name: s.provider.name,
        rating: s.provider.rating || 0,
        distanceKm: Number(distanceKm.toFixed(2)),
        price: s.price || 0,
      });
    }

    let candidates = [...allOnline];
    const pref = booking.sortPreference || 'nearby';
    let note = null;
    if (pref === 'rating') {
      candidates = candidates.filter(c => c.rating >= 4);
      if (candidates.length === 0) {
        candidates = allOnline.filter(c => c.rating >= 3);
        if (candidates.length === 0) { candidates = [...allOnline]; note = 'Fallback to nearest due to limited options'; }
      }
      candidates.sort((a,b)=> (b.rating - a.rating) || (a.distanceKm - b.distanceKm));
    } else if (pref === 'nearby') {
      const bands = [ {min:1, max:5}, {min:0, max:8}, {min:0, max:12}, {min:0, max:15} ];
      let filtered = [];
      for (const b of bands) { filtered = allOnline.filter(c => c.distanceKm >= b.min && c.distanceKm <= b.max); if (filtered.length) break; }
      candidates = filtered.length ? filtered : allOnline;
      if (!filtered.length) note = 'Fallback to nearest available';
      candidates.sort((a,b)=> (a.distanceKm - b.distanceKm) || (b.rating - a.rating));
    } else if (pref === 'cheapest') {
      candidates.sort((a,b)=> (a.price - b.price) || (b.rating - a.rating) || (a.distanceKm - b.distanceKm));
    } else { // mix
      const proximityScore = (dKm) => Math.max(0, 5 - (dKm / 3));
      candidates = candidates.map(c => ({...c, mixScore: (c.rating * 0.6) + (proximityScore(c.distanceKm) * 0.4)}))
        .sort((a,b)=> (b.mixScore - a.mixScore) || (a.distanceKm - b.distanceKm));
    }

    res.json({ count: candidates.length, preference: pref, note, candidates });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Get pending job count for provider
export const getPendingCount = async (req, res) => {
  try {
    const providerId = req.userId;
    
    // Count bookings where:
    // 1. Status is 'requested' or 'pending_offers'
    // 2. Provider has a pending offer OR is assigned provider
    const bookings = await Booking.find({
      status: { $in: ['requested', 'pending_offers'] }
    }).populate('service', 'provider');

    const count = bookings.filter(b => {
      // If directly assigned to this provider
      if (b.provider && b.provider.toString() === providerId) return true;
      // If service owner (legacy)
      const serviceOwner = b.service && b.service.provider && b.service.provider.toString();
      if (!b.provider && serviceOwner === providerId) return true;
      // If has a pending offer
      if (b.offers && b.offers.some(o => 
        o.provider && o.provider.toString() === providerId && o.status === 'pending'
      )) return true;
      return false;
    }).length;

    res.json({ count });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Calculate estimate based on service catalog and questionnaire answers
export const calculateEstimate = async (req, res) => {
  try {
    const { serviceCatalogId, answers } = req.body;
    
    const serviceCatalog = await ServiceCatalog.findById(serviceCatalogId);
    if (!serviceCatalog) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    const pricing = serviceCatalog.pricing;
    let serviceCharge = pricing.basePrice;
    
    // Calculate based on answers and pricing rules
    Object.entries(answers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Checkbox - add all selected option prices
        value.forEach(option => {
          const price = pricing.optionPrices.get(option);
          if (price) serviceCharge += price;
        });
      } else if (typeof value === 'string') {
        // Radio/select - add option price
        const price = pricing.optionPrices.get(value);
        if (price) serviceCharge += price;
      } else if (key === 'area' && typeof value === 'number') {
        // Special case for area-based pricing (painting)
        serviceCharge = pricing.basePrice * value;
        
        // Add finish price
        if (answers.finish) {
          const finishPrice = pricing.optionPrices.get(answers.finish);
          if (finishPrice) serviceCharge += (finishPrice * value);
        }
      }
    });
    
    // Apply quantity multiplier
    if (pricing.quantityMultiplier) {
      const quantityFields = ['numberOfUnits', 'quantity', 'numberOfCameras', 'numberOfPoints', 'numberOfFixtures'];
      for (const field of quantityFields) {
        if (answers[field] && typeof answers[field] === 'number') {
          serviceCharge = serviceCharge * answers[field];
          break;
        }
      }
    }
    
    // Apply complexity multiplier
    if (pricing.complexityMultipliers && answers.complexity) {
      const multiplier = pricing.complexityMultipliers.get(answers.complexity) || 1.0;
      serviceCharge = serviceCharge * multiplier;
    }
    
    const visitCharge = pricing.visitCharge || 0;
    const platformFee = Math.max(20, Math.round(serviceCharge * 0.012)); // 1.2%
    const subtotal = serviceCharge + visitCharge;
    const total = subtotal + platformFee;
    
    res.json({
      estimate: {
        serviceCharge: Math.round(serviceCharge),
        visitCharge,
        platformFee,
        subtotal: Math.round(subtotal),
        total: Math.round(total),
        breakdown: {
          serviceName: serviceCatalog.name,
          answers
        }
      }
    });
    
  } catch (error) {
    console.error('Estimate calculation error:', error);
    res.status(500).json({ message: 'Error calculating estimate', error: error.message });
  }
};

// Create booking with questionnaire-based flow (Pay Later only)
export const createBookingWithQuestionnaire = async (req, res) => {
  try {
    const { serviceCatalogId, preferredDateTime, serviceDetails, sortPreference, location } = req.body;
    const customerId = req.userId;

    // Validate required fields
    if (!serviceCatalogId || !preferredDateTime || !serviceDetails || !sortPreference || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create a booking ID
    const bookingId = await nextBookingId();

    // ===== Provider discovery based on selected preference =====
    const lng = Number(location.lng);
    const lat = Number(location.lat);

    // Helper: haversine distance in km
    const distKm = (lng1, lat1, lng2, lat2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find services that match this catalog by name or category
    const catalog = await ServiceCatalog.findById(serviceCatalogId).lean();
    console.log('🔍 Looking for catalog:', catalog.name, 'in category:', catalog.category);
    
    // First try exact name match
    const safeName = catalog.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '.');
    const nameRegex = new RegExp(safeName, 'i');
    
    let services = await Service.find({
      name: { $regex: nameRegex }
    }).populate('provider','name rating ratingCount isAvailable location');
    
    console.log('📋 Found services by NAME match:', services.map(s => ({ 
      name: s.name, 
      provider: s.provider?.name, 
      isAvailable: s.provider?.isAvailable,
      hasLocation: !!s.provider?.location 
    })));
    
    // If no exact name matches, fall back to category
    if (services.length === 0) {
      console.log('⚠️ No name matches found, searching by category:', catalog.category);
      services = await Service.find({
        category: { $regex: new RegExp(`^${catalog.category}$`, 'i') }
      }).populate('provider','name rating ratingCount isAvailable location');
      
      console.log('📋 Found services by CATEGORY match:', services.map(s => ({ 
        name: s.name, 
        provider: s.provider?.name, 
        isAvailable: s.provider?.isAvailable,
        hasLocation: !!s.provider?.location 
      })));
    }

    const allOnline = [];
    for (const s of services) {
      if (!s.provider) continue;
      const prov = s.provider;
      if (!prov.isAvailable) continue;
      const coords = Array.isArray(prov.location?.coordinates) ? prov.location.coordinates : [null,null];
      const [plng, plat] = coords;
      if (typeof plng !== 'number' || typeof plat !== 'number') continue; // skip invalid
      const distanceKm = distKm(lng, lat, plng, plat);
      allOnline.push({ service: s, provider: prov, distanceKm, rating: prov.rating || 0, rate: s.price || 0 });
    }
    
    // Check for incomplete bookings for each provider
    const providerIds = allOnline.map(c => c.provider._id);
    const incompleteBookings = await Booking.find({
      provider: { $in: providerIds },
      status: 'completed',
      $or: [
        { billDetails: { $exists: false } },
        { paymentStatus: { $ne: 'paid' } }
      ]
    }).select('provider bookingId status paymentStatus billDetails').lean();
    
    const incompleteByProvider = {};
    incompleteBookings.forEach(b => {
      const key = b.provider.toString();
      if (!incompleteByProvider[key]) incompleteByProvider[key] = [];
      incompleteByProvider[key].push({
        bookingId: b.bookingId,
        hasBill: !!b.billDetails,
        paymentStatus: b.paymentStatus
      });
    });
    
    console.log('✅ Live providers:', allOnline.map(c => ({ 
      provider: c.provider.name, 
      id: c.provider._id.toString().slice(-6),
      distance: c.distanceKm.toFixed(2) + ' km', 
      rating: c.rating,
      incompleteJobs: incompleteByProvider[c.provider._id.toString()]?.length || 0,
      unpaidBills: incompleteByProvider[c.provider._id.toString()] || []
    })));

    let candidates = [];
    let assignmentNote = undefined;

    if (sortPreference === 'rating') {
      // Prefer 4-5 stars
      candidates = allOnline.filter(c => c.rating >= 4);
      if (candidates.length === 0) {
        // Fallback to 3+
        candidates = allOnline.filter(c => c.rating >= 3);
        if (candidates.length === 0) {
          if (allOnline.length === 0) {
            return res.status(400).json({ message: 'No providers currently available.' });
          }
          // Fallback to nearest available with message
          assignmentNote = 'Showing nearest available provider due to limited options.';
          candidates = [...allOnline];
          candidates.sort((a,b)=> (a.distanceKm - b.distanceKm) || (b.rating - a.rating));
        }
      }
      if (!assignmentNote) {
        candidates.sort((a,b)=> (b.rating - a.rating) || (a.distanceKm - b.distanceKm));
      }
    } else if (sortPreference === 'nearby') {
      // Prefer within 1–5 km, then expand to 8, 12, 15
      const bands = [
        {min:1, max:5},
        {min:0, max:8},
        {min:0, max:12},
        {min:0, max:15}
      ];
      for (const b of bands) {
        candidates = allOnline.filter(c => c.distanceKm >= b.min && c.distanceKm <= b.max);
        if (candidates.length > 0) break;
      }
      if (candidates.length === 0) {
        if (allOnline.length === 0) return res.status(400).json({ message: 'No nearby providers available.' });
        // Fallback to nearest available
        assignmentNote = 'Showing nearest available provider due to limited options.';
        candidates = [...allOnline];
      }
      candidates.sort((a,b)=> (a.distanceKm - b.distanceKm) || (b.rating - a.rating));
    } else if (sortPreference === 'cheapest') {
      if (allOnline.length === 0) return res.status(400).json({ message: 'No available providers for this service.' });
      candidates = [...allOnline];
      candidates.sort((a,b)=> (a.rate - b.rate) || (b.rating - a.rating) || (a.distanceKm - b.distanceKm));
    } else { // 'mix'
      if (allOnline.length === 0) return res.status(400).json({ message: 'No providers currently available.' });
      const proximityScore = (dKm) => Math.max(0, 5 - (dKm / 3)); // 0..15km -> 5..0
      candidates = allOnline.map(c => ({
        ...c,
        mixScore: (c.rating * 0.6) + (proximityScore(c.distanceKm) * 0.4)
      }));
      candidates.sort((a,b)=> (b.mixScore - a.mixScore) || (a.distanceKm - b.distanceKm));
    }

    if (candidates.length === 0) {
      return res.status(400).json({ message: 'No matching live providers available right now for the selected preference' });
    }

    // Prepare offers queue similar to multi-provider flow
    // ✅ Offer timeout: 2 minutes (120 seconds) per provider for demo
    const OFFER_TIMEOUT_MS = 120 * 1000; // 2 minutes per offer
    const first = candidates[0];
    const queue = candidates.slice(1).map(c => c.provider._id);
    const now = new Date();

    console.log('🎯 SELECTED PROVIDER:', {
      providerName: first.provider.name,
      providerId: first.provider._id.toString(),
      last6chars: first.provider._id.toString().slice(-6),
      distance: first.distanceKm.toFixed(2) + ' km',
      rating: first.rating,
      price: first.rate,
      sortPreference: sortPreference,
      reason: sortPreference === 'nearby' ? 'Nearest' : 
              sortPreference === 'rating' ? 'Highest rated' :
              sortPreference === 'cheapest' ? 'Lowest price' :
              'Best mix score'
    });
    
    console.log('📊 ALL CANDIDATES (in priority order):', candidates.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      name: c.provider.name,
      id: c.provider._id.toString().slice(-6),
      distance: c.distanceKm.toFixed(2) + ' km',
      rating: c.rating,
      price: c.rate,
      selected: i === 0 ? '✅ YES' : '❌ No'
    })));

    const booking = await Booking.create({
      bookingId,
      customer: customerId,
      service: first.service._id,
      serviceTemplate: first.service.template,
      serviceCatalog: serviceCatalogId,
      preferredDateTime,
      serviceDetails: {
        answers: serviceDetails.answers,
        estimate: serviceDetails.estimate
      },
      sortPreference,
      location: { type: 'Point', coordinates: [lng, lat] },
      status: 'requested',
      paymentStatus: 'pending',
      overallStatus: 'pending',
      pendingProviders: queue,
      offers: [{ provider: first.provider._id, status: 'pending', offeredAt: now }],
      providerResponseTimeout: new Date(now.getTime() + OFFER_TIMEOUT_MS),
      autoAssignMessage: assignmentNote || 'Searching for the best available provider...'
    });
    
    console.log('✅ Booking created:', {
      id: booking.bookingId,
      status: booking.status,
      offersCount: booking.offers?.length,
      firstOffer: booking.offers?.[0]?.provider?.toString()
    });

    res.status(201).json({ 
      message: assignmentNote || 'Booking created! Waiting for provider response...', 
      booking,
      assignmentNote
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
};

// Mark booking as paid via Razorpay (online payment)
export const markOnlinePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Verify customer owns this booking
    if (booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // In production, verify signature with Razorpay secret
    // For now, mark as paid
    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'razorpay';
    booking.paymentDetails = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paidAt: new Date()
    };
    await booking.save();
    
    // Credit provider wallet if provider is assigned
    if (booking.provider && booking.serviceDetails?.estimate?.total) {
      await User.findByIdAndUpdate(booking.provider, {
        $inc: { walletBalance: booking.serviceDetails.estimate.total }
      });
    }
    
    res.json({ success: true, message: 'Payment verified successfully', booking });
  } catch (error) {
    console.error('Mark online paid error:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Mark booking as paid via Cash
export const markCashPaid = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Verify customer owns this booking
    if (booking.customer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    booking.paymentStatus = 'paid';
    booking.paymentMethod = 'cash';
    booking.paymentDetails = {
      paidAt: new Date()
    };
    await booking.save();
    
    res.json({ success: true, message: 'Cash payment confirmed', booking });
  } catch (error) {
    console.error('Mark cash paid error:', error);
    res.status(500).json({ message: 'Error processing cash payment', error: error.message });
  }
};
