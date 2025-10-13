# 🧪 COMPREHENSIVE TESTING GUIDE - LocalHands

## 📋 Overview

This testing suite provides **complete end-to-end testing** for all LocalHands workflows, including:

- ✅ User Registration & OTP Authentication
- ✅ Location Updates & Live Mode
- ✅ Sorting Logic (Nearest, Rating, Balanced)
- ✅ Booking Flow with Queue System
- ✅ Real-Time Chat (Socket.IO)
- ✅ Service Completion & Location Updates
- ✅ Rating & Review System
- ✅ Database Consistency Validation
- ✅ Stress Testing (Concurrent requests)

---

## 🚀 Quick Start

### **1. Install Dependencies**

```bash
cd backend
npm install
```

**Required packages:**
- `jest` - Testing framework
- `supertest` - HTTP testing
- `socket.io-client` - WebSocket testing

If not installed:
```bash
npm install --save-dev jest supertest socket.io-client
```

### **2. Seed Test Data**

```bash
npm run seed:test-data
```

**This creates:**
- 1 Customer: Ravi (+919876543210)
- 4 Providers: Arjun, Deepak, Sneha, Ramesh
- 3 Services: Plumbing Service, Emergency Plumbing, Pipe Installation
- 2 Sample Bookings (1 completed, 1 active)
- 1 Sample Review

### **3. Run Tests**

```bash
# Run full comprehensive test suite
npm run test:comprehensive

# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch
```

---

## 📊 Test Suite Structure

### **Test 1: User Registration & OTP** 👥

**What it tests:**
- OTP request via `/api/auth/mobile/request-otp`
- OTP verification and registration via `/api/auth/mobile/verify-register`
- Creating 1 customer + 4 providers
- Setting initial ratings and locations

**Expected outcomes:**
- ✅ All 5 users created successfully
- ✅ OTP verification works
- ✅ JWT tokens generated
- ✅ Ratings and locations stored correctly

**Test data:**
| User   | Phone          | Role     | Rating | Location (Lat,Lng) |
|--------|----------------|----------|--------|-------------------|
| Ravi   | +919876543210  | customer | —      | (17.4065, 78.4772) |
| Arjun  | +919876543211  | provider | 4.8    | (17.4051, 78.4790) |
| Deepak | +919876543212  | provider | 4.6    | (17.4078, 78.4731) |
| Sneha  | +919876543213  | provider | 3.9    | (17.4100, 78.4785) |
| Ramesh | +919876543214  | provider | 4.2    | (17.4038, 78.4759) |

---

### **Test 2: Location & Live Mode** 🌍

**What it tests:**
- Toggling providers to live mode (`isAvailable: true`)
- Periodic location updates via `/api/users/location`
- Removing providers from map when offline
- Database updates for coordinates

**Expected outcomes:**
- ✅ All 4 providers go live successfully
- ✅ Location updates persist in MongoDB
- ✅ Offline providers disappear from live map
- ✅ Leaflet map shows only live providers

**Test scenarios:**
1. All providers toggle "Go Live" → `isAvailable = true`
2. Provider 2 goes offline → Only 3 visible on map
3. Location update every 30s → New coordinates in DB

---

### **Test 3: Sorting Logic** 🔍

**What it tests:**
- **Nearest:** Sort by distance from customer
- **Highest Rating:** Sort by provider rating (descending)
- **Balanced:** Formula = `distance × 0.7 + (5 - rating) × 0.3 × 1000`

**Expected outcomes:**
- ✅ Nearest sorting: Closest provider appears first
- ✅ Rating sorting: 4.8 → 4.6 → 4.2 → 3.9
- ✅ Balanced: Correct formula application

**Test query:**
```javascript
GET /api/providers/nearby
?latitude=17.4065
&longitude=78.4772
&maxDistance=5000
&sortBy=distance|rating|balanced
```

**Expected order:**
- **Nearest:** Provider closest to customer
- **Rating:** Arjun (4.8) → Deepak (4.6) → Ramesh (4.2) → Sneha (3.9)
- **Balanced:** Mix of distance and rating

---

### **Test 4: Booking Flow & Queue** 📦

**What it tests:**
- Creating booking request
- Provider queue sorting
- 10-second accept window
- Auto-transfer to next provider on rejection/timeout
- One-lock-per-job enforcement

**Expected outcomes:**
- ✅ Booking created with sorted provider queue
- ✅ First provider gets 10s to accept
- ✅ On rejection → Auto-transfer to next
- ✅ Only one provider can accept
- ✅ Other providers see "Booking unavailable"

**Test scenarios:**
1. Customer books Plumbing service
2. System dispatches to Arjun (first in queue based on sort mode)
3. Arjun has 10 seconds to accept
4. If Arjun rejects → Automatically goes to Deepak
5. Deepak accepts → Booking locked, others blocked

**Endpoints tested:**
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/accept` - Accept booking
- `PATCH /api/bookings/:id/reject` - Reject booking

---

### **Test 5: Real-Time Chat** 💬

**What it tests:**
- Socket.IO connection establishment
- Chat room creation for booking
- Real-time message exchange
- Typing indicators
- Message persistence in memory
- Auto-cleanup on booking completion

**Expected outcomes:**
- ✅ Chat room created between customer and provider
- ✅ Messages sent/received in real-time (< 200ms latency)
- ✅ Typing indicator appears/disappears
- ✅ Messages stored in memory (not DB)
- ✅ Chat deleted 5 seconds after booking completion

**Socket events tested:**
- `join-booking-chat` - Join room
- `send-message` - Send message
- `new-message` - Receive message
- `typing` / `stop-typing` - Typing indicators
- `chat-history` - Get previous messages

**Test messages:**
- Customer: "Please bring wrench"
- Provider: "On the way"

---

### **Test 6: Service Completion & Location Update** 📍

**What it tests:**
- Completing service via `/api/bookings/:id/complete`
- Updating booking status to `completed`
- Updating provider location to customer's coordinates
- Setting provider to offline (`isAvailable = false`)
- Triggering rating popup

**Expected outcomes:**
- ✅ Booking status → `completed`
- ✅ `completedAt` timestamp set
- ✅ Provider location updated to customer location
- ✅ Provider goes offline automatically
- ✅ Rating prompt appears for customer

**Logic:**
```javascript
// After service completion
provider.location.coordinates = booking.location.coordinates;
provider.isAvailable = false;
booking.status = 'completed';
booking.completedAt = new Date();
```

---

### **Test 7: Rating & Review System** ⭐

**What it tests:**
- Customer rating provider after completion
- Review comment storage
- Average rating calculation
- Rating count increment
- Preventing duplicate ratings

**Expected outcomes:**
- ✅ Customer can rate provider (1-5 stars)
- ✅ Review comment stored in DB
- ✅ Provider average rating updated
- ✅ Rating count incremented
- ✅ Cannot rate same booking twice

**Test rating:**
- Rating: 4.5 stars
- Comment: "Good service, very professional"

**Average rating formula:**
```javascript
newAverage = ((currentAverage × currentCount) + newRating) / (currentCount + 1)
```

---

### **Test 8: Database Consistency** 📊

**What it tests:**
- No orphaned bookings (all reference valid users/services)
- No duplicate phone numbers
- All reviews linked to correct bookings
- Valid timestamps (createdAt, updatedAt, completedAt)
- Foreign key integrity

**Expected outcomes:**
- ✅ All bookings have valid customer + provider + service
- ✅ No duplicate users
- ✅ All reviews match booking participants
- ✅ Timestamps are valid Date objects
- ✅ No localStorage usage (all in MongoDB)

**Validation queries:**
```javascript
// Check orphaned bookings
for (booking of allBookings) {
  assert(await User.findById(booking.customer)); // Customer exists
  assert(await User.findById(booking.provider)); // Provider exists
  assert(await Service.findById(booking.service)); // Service exists
}

// Check duplicate phones
const phones = await User.find().distinct('phone');
assert(phones.length === uniquePhones.length);

// Check review integrity
for (review of allReviews) {
  const booking = await Booking.findById(review.booking);
  assert(booking.customer === review.customer);
  assert(booking.provider === review.provider);
}
```

---

### **Test 9: Stress Testing** ⚙️

**What it tests:**
- 3 simultaneous booking requests
- Multiple rejections by same provider
- System stability under load
- Race condition handling
- Concurrent location updates

**Expected outcomes:**
- ✅ All 3 requests succeed without conflicts
- ✅ Each request gets unique provider assignment
- ✅ Provider can reject multiple requests sequentially
- ✅ All rejected bookings transfer to next provider
- ✅ System remains stable (no crashes)
- ✅ Average latency < 2 seconds

**Test scenarios:**

**Scenario 1: Simultaneous Bookings**
```javascript
const requests = [
  createBooking(), // Request 1
  createBooking(), // Request 2
  createBooking()  // Request 3
];
await Promise.all(requests); // All succeed
```

**Scenario 2: Multiple Rejections**
```javascript
// Create 3 bookings, same provider rejects all
await rejectBooking(booking1); // Moves to next provider
await rejectBooking(booking2); // Moves to next provider
await rejectBooking(booking3); // Moves to next provider
// All bookings successfully transferred
```

**Scenario 3: Location Update Load**
```javascript
// 10 rapid location updates
for (let i = 0; i < 10; i++) {
  await updateLocation(newCoords);
}
// All succeed, avg latency < 2s
```

---

## 🎯 Expected Test Output

### **Success Report:**

```json
{
  "testSummary": "All 9 core workflows executed successfully",
  "totalTests": 42,
  "passedTests": 42,
  "failedTests": 0,
  "failedCases": [],
  "performanceNotes": [
    "Location update latency < 1.5s",
    "Chat delay < 200ms",
    "Sorting formula accurate",
    "Queue system working correctly",
    "No race conditions detected"
  ],
  "databaseIntegrity": {
    "orphanedRecords": 0,
    "duplicateUsers": 0,
    "invalidTimestamps": 0,
    "brokenReferences": 0
  },
  "featureStatus": {
    "registration": "✅ Working",
    "jwtAuth": "✅ Working",
    "liveLocation": "✅ Working (30s updates)",
    "sorting": "✅ All 3 modes working",
    "bookingQueue": "✅ Working with 10s timeout",
    "oneLockPerJob": "✅ Enforced",
    "realTimeChat": "✅ Working with Socket.IO",
    "ratingSystem": "✅ Working with auto-popup",
    "dbIntegrity": "✅ Consistent, no localStorage"
  },
  "suggestions": [
    "Add typing indicator timeout visual feedback",
    "Add service completion timestamp in UI",
    "Consider Redis for Socket.IO scaling",
    "Add rate limiting for chat messages",
    "Add push notifications for new bookings"
  ]
}
```

---

## 🐛 Troubleshooting

### **Issue: Tests failing to connect to database**

**Solution:**
```bash
# Check MongoDB is running
mongosh

# Verify MONGO_URI in .env
MONGO_URI=mongodb://localhost:27017/localhands_test

# Create test database
use localhands_test
```

### **Issue: Socket.IO tests timing out**

**Solution:**
```bash
# Ensure backend server is running
npm start

# Check Socket.IO port in test
const BASE_URL = 'http://localhost:5000';

# Increase timeout in jest.config.cjs
testTimeout: 30000 // 30 seconds
```

### **Issue: OTP tests failing (Twilio)**

**Solution:**
```javascript
// For development, use OTP from database
const user = await User.findOne({ phone });
const otp = user.phoneOtp; // Use this OTP

// Or mock Twilio in tests
jest.mock('../utils/twilioWhatsApp.js', () => ({
  sendWhatsAppOTP: jest.fn().mockResolvedValue(true)
}));
```

### **Issue: Chat messages not appearing**

**Solution:**
```bash
# Verify Socket.IO server initialized
# Check backend logs for:
"Socket.IO ready for real-time chat"

# Check CORS settings
cors: { origin: 'http://localhost:3000' }

# Test Socket.IO connection manually
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('Connected'));
```

---

## 📈 Performance Benchmarks

### **Target Metrics:**

| Metric                    | Target    | Acceptable | Critical |
|---------------------------|-----------|------------|----------|
| Location Update Latency   | < 1s      | < 2s       | < 3s     |
| Chat Message Delay        | < 100ms   | < 200ms    | < 500ms  |
| Booking Creation Time     | < 500ms   | < 1s       | < 2s     |
| Rating Submission         | < 300ms   | < 500ms    | < 1s     |
| Provider Search Query     | < 200ms   | < 500ms    | < 1s     |
| Sorting Calculation       | < 50ms    | < 100ms    | < 200ms  |

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

- [ ] All 42 tests passing
- [ ] Zero failed cases
- [ ] Database consistency: 100%
- [ ] No orphaned records
- [ ] All timestamps valid
- [ ] Socket.IO stable under load
- [ ] Chat latency < 200ms
- [ ] Location updates < 2s
- [ ] OTP delivery working (Twilio configured)
- [ ] JWT authentication secure
- [ ] CORS properly configured
- [ ] Environment variables set
- [ ] MongoDB indexes created
- [ ] Error handling tested
- [ ] Race conditions handled

---

## 🎓 Running Tests Manually

### **Test User Registration:**

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Test registration
curl -X POST http://localhost:5000/api/auth/mobile/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Use OTP from database or server logs
curl -X POST http://localhost:5000/api/auth/mobile/verify-register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456", "name": "Ravi", "role": "customer"}'
```

### **Test Booking Flow:**

```bash
# Create booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "<service_id>",
    "scheduledFor": "2025-10-15T10:00:00Z",
    "address": "Test Address",
    "latitude": 17.4065,
    "longitude": 78.4772
  }'

# Accept booking (provider)
curl -X PATCH http://localhost:5000/api/bookings/<booking_id>/accept \
  -H "Authorization: Bearer <provider_token>"
```

### **Test Chat:**

```javascript
// Open browser console
const socket = io('http://localhost:5000');

socket.emit('join-booking-chat', {
  bookingId: '<booking_id>',
  userId: '<user_id>',
  userName: 'Ravi',
  userRole: 'customer'
});

socket.emit('send-message', {
  bookingId: '<booking_id>',
  message: 'Hello!',
  senderId: '<user_id>',
  senderName: 'Ravi',
  senderRole: 'customer'
});

socket.on('new-message', (msg) => console.log(msg));
```

---

## 📞 Support

If tests fail or you encounter issues:

1. Check **backend logs** for errors
2. Verify **MongoDB connection** is active
3. Ensure **Socket.IO server** is running
4. Check **.env variables** are set correctly
5. Run `npm run seed:test-data` to reset test data
6. Review **TESTING_GUIDE.md** for troubleshooting

---

**Happy Testing! 🧪**

All tests should pass with **100% success rate** for production readiness.
