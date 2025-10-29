# LocalHands - Complete Project Documentation
## Software Requirements Specification (SRS) & Presentation Guide

---

## 1. PROJECT OVERVIEW

### 1.1 Project Name
**LocalHands - On-Demand Local Services Platform**

### 1.2 Project Description
LocalHands is a comprehensive web-based platform that connects customers with local service providers (plumbers, electricians, carpenters, painters, etc.) in their area. The platform enables real-time service booking, live tracking, automated billing, and secure payments.

### 1.3 Project Objectives
- Connect customers with verified local service providers instantly
- Provide real-time provider tracking and ETA
- Automate bill generation from service estimates
- Enable secure online and cash payments
- Offer transparent pricing through service questionnaires
- Maintain quality through rating and review system
- Ensure fair compensation with platform fee structure (10% platform, 90% provider)

### 1.4 Target Users
1. **Customers**: Individuals/households needing local services
2. **Service Providers**: Skilled professionals offering services
3. **Admin**: Platform administrators managing operations

---

## 2. SYSTEM ARCHITECTURE

### 2.1 Technology Stack

#### Frontend
- **Framework**: React 18.2.0
- **Routing**: React Router DOM v7.9.1
- **UI Libraries**: 
  - Material-UI (MUI) v7.3.2
  - Tailwind CSS v3.4.17
  - Framer Motion v12.23.22
- **Maps**: Leaflet v1.9.4, React-Leaflet v4.2.1
- **State Management**: React Hooks
- **HTTP Client**: Axios v1.12.2
- **Authentication**: JWT, Google OAuth (@react-oauth/google)
- **QR Code**: html5-qrcode, qrcode.react

#### Backend
- **Runtime**: Node.js with Express v5.1.0
- **Database**: MongoDB Atlas (Mongoose v8.18.2)
- **Authentication**: JWT (jsonwebtoken v9.0.2), bcryptjs v3.0.2
- **Payment Gateway**: Razorpay v2.9.6
- **Communication**: Twilio v5.10.2 (WhatsApp OTP)
- **Image Storage**: Cloudinary v2.7.0
- **Real-time**: Socket.io v4.8.1
- **Email**: Nodemailer (via Gmail SMTP)

### 2.2 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Customer │  │ Provider │  │  Admin   │  │  Mobile  │   │
│  │   UI     │  │    UI    │  │    UI    │  │   Auth   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 REST API (Express.js)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth | Bookings | Billing | Reviews | Notifications │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (MongoDB)                         │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Users  │  │Bookings │  │Transactions│  │ Services │  │
│  └─────────┘  └─────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│             EXTERNAL SERVICES                                │
│  Razorpay | Cloudinary | Twilio | Google OAuth | Gmail     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. USER ROLES & WORKFLOWS

### 3.1 CUSTOMER WORKFLOW

#### A. Registration & Login
1. **Email/Password Registration**
   - Customer provides name, email, phone, password
   - System sends verification email
   - Customer verifies email and logs in

2. **Google OAuth**
   - One-click Google Sign-In
   - Auto-creates account with Google profile
   - Customer selects role (customer/provider) on first login

3. **Mobile QR Authentication**
   - Customer scans QR code from mobile app
   - Instant login without password
   - Session synced across devices

#### B. Service Discovery
1. **Browse Service Catalog**
   - View categories: Plumbing, Electrical, Carpentry, Painting, etc.
   - See service descriptions and base pricing
   - Filter by category

2. **Location Selection**
   - Enter service address manually OR
   - Click on interactive map (Leaflet) to set location
   - System captures GPS coordinates (lat/lng)

#### C. Service Booking (Questionnaire Flow)
1. **Answer Service-Specific Questions**
   - Dynamic questionnaire based on service type
   - Example for Plumbing:
     - "What type of issue?" (Leak, Installation, Repair)
     - "Urgency level?" (Emergency, Same Day, Schedule Later)
     - "Number of fixtures affected?"
   
2. **Get Instant Estimate**
   - System calculates:
     - Service charge (based on answers)
     - Visit charge (standard fee)
     - Platform fee (10%)
     - **Total estimate** shown before booking

3. **Schedule Service**
   - Select date/time or request ASAP
   - Confirm booking with estimate

4. **Provider Assignment (Intelligent Matching)**
   - System finds available providers nearby
   - Ranks by: Rating → Experience (completed jobs) → Distance
   - Sends offer to top provider (2-minute timeout)
   - If declined/expired, moves to next provider automatically
   - Customer sees status: "Searching for best provider..."

#### D. Service Tracking
1. **Provider Accepts**
   - Customer receives notification
   - Status changes to "In Progress"
   - Provider's availability auto-pauses

2. **Real-Time Tracking**
   - Click "📍 Track Provider" button
   - See live map with:
     - Provider location (blue marker at start point, e.g., KMIT)
     - Customer location (red marker at destination)
     - Route line connecting both
     - Distance (km) and ETA (minutes)
   - Map auto-updates every 10 seconds
   - Provider location tracked via GPS updates

3. **Service Completion**
   - Provider marks job as "Completed"
   - System auto-generates bill from original estimate
   - Customer receives bill notification

#### E. Payment Flow
1. **View Bill**
   - Click "Pay Now" on completed booking
   - See detailed bill breakdown:
     - Service charges
     - Visit charge
     - Tax (if any)
     - Discount (if any)
     - **Total amount**

2. **Select Payment Method**
   - **Option 1: Pay Online (Razorpay)**
     - Secure Razorpay checkout popup
     - Supports Credit/Debit cards, UPI, Net Banking
     - Server creates order with signature verification
     - Payment confirmed in real-time
   
   - **Option 2: Paid in Cash**
     - Confirm cash payment to provider
     - System marks booking as paid

3. **Post-Payment**
   - Transaction record created
   - Provider earnings updated (90% of total)
   - Platform fee collected (10% of total)
   - Provider's pending balance moves to withdrawable
   - Customer can view payment history

#### F. Review & Rating
1. **Rate Service**
   - After payment, customer prompted to rate
   - 1-5 star rating
   - Optional written review
   - Photos of completed work (optional)

2. **Impact**
   - Updates provider's average rating
   - Affects provider ranking for future bookings

---

### 3.2 PROVIDER WORKFLOW

#### A. Onboarding & Verification
1. **Register as Provider**
   - Provide professional details
   - Select service categories offered
   - Upload profile photo

2. **License Verification**
   - Upload government ID (Aadhar/PAN/Driving License)
   - Submit license image
   - Admin reviews and approves/rejects
   - Status shown: Pending → Approved/Rejected

3. **Approval Required**
   - Cannot go live until admin approves
   - Receives email notification on approval

#### B. Go Live / Availability Management
1. **Toggle Availability**
   - "Go Live" button in dashboard
   - System captures current GPS location
   - Status changes to "Available"
   - Provider now visible to nearby customers

2. **Auto-Pause During Service**
   - When provider accepts booking, auto-switches to unavailable
   - Prevents multiple simultaneous bookings
   - Can manually go live again after completing service

3. **Location Updates**
   - While live, provider app sends GPS updates
   - Used for customer tracking
   - Updates booking's `providerLocation` field

#### C. Receiving & Managing Bookings
1. **Incoming Offer Notification**
   - Push notification: "New service request nearby!"
   - See booking details:
     - Customer name, phone
     - Service type
     - Location distance
     - Estimated earnings
     - **2-minute countdown** to respond

2. **Accept or Decline**
   - **Accept**: 
     - Booking assigned to provider
     - Customer notified
     - Status → In Progress
     - Provider auto-paused
   
   - **Decline**:
     - Offer moves to next best provider
     - No penalty (for now)

3. **View Active Bookings**
   - See all in-progress jobs
   - Customer contact details
   - Service address
   - Scheduled date/time

#### D. Service Execution
1. **Track Customer (Provider View)**
   - Click "📍 Track Customer"
   - See map with:
     - Own location (start point)
     - Customer location (destination)
     - Route and ETA
   - Navigate using map or "View in Google Maps" link

2. **Update Location**
   - Provider mobile app sends GPS coordinates
   - Backend updates `Booking.providerLocation`
   - Customer sees live movement on their map

3. **Mark Completed**
   - Click "Mark as Completed" when done
   - System auto-generates bill if estimate exists
   - Provider's `completedJobs` counter increments

#### E. Billing & Earnings
1. **Generate Bill (Manual - if needed)**
   - If auto-bill fails, provider can manually create
   - Enter service charges, extra fees
   - Add notes
   - Bill sent to customer

2. **View Earnings Dashboard**
   - **Total Earnings**: Lifetime revenue
   - **Pending Earnings**: Bills sent but unpaid
   - **Withdrawable Balance**: Paid earnings ready to withdraw
   - Recent completed jobs list
   - Transaction history

3. **Earnings Flow**
   - On completion: Amount added to `pendingEarnings`
   - On customer payment: 
     - Pending → 0
     - Withdrawable → +90% of bill
     - Platform keeps 10%

#### F. Reviews & Rating
1. **Receive Customer Ratings**
   - Customers rate after payment
   - Average rating displayed on profile
   - Impacts future booking priority

2. **Respond to Reviews** (future)
   - Reply to customer feedback

---

### 3.3 ADMIN WORKFLOW

#### A. Dashboard Overview
1. **Real-Time Analytics**
   - Total platform revenue (sum of all platform fees)
   - Total provider earnings
   - Number of transactions
   - Total amount processed
   - Recent transactions list

2. **Metrics Cards**
   - Active providers online
   - Pending verifications
   - Today's bookings
   - Revenue trends

#### B. Provider Management
1. **Verification Queue**
   - List of providers awaiting approval
   - View submitted documents:
     - License image
     - License type and number
     - Submission date

2. **Approve/Reject**
   - **Approve**:
     - Provider can now go live
     - Email notification sent
     - Status → Approved
   
   - **Reject**:
     - Provide rejection reason
     - Provider must resubmit
     - Status → Rejected

3. **Provider List**
   - View all providers
   - Filter by status, rating, location
   - Deactivate problematic providers

#### C. Service Catalog Management
1. **Create Service Templates**
   - Define service categories
   - Set base pricing
   - Configure questionnaire fields

2. **Edit/Delete Services**
   - Update pricing
   - Activate/deactivate categories

#### D. Booking Oversight
1. **View All Bookings**
   - Real-time booking status
   - Filter by status (requested, in_progress, completed, cancelled)
   - Track payment status

2. **Force Actions (Debug)**
   - Manually advance offer queue
   - Cancel problematic bookings
   - Refund transactions

#### E. Financial Reports
1. **Revenue Dashboard**
   - Total platform fees collected
   - Total amount paid to providers
   - Transaction breakdown by payment method
   - Export reports (future)

2. **Provider Payouts** (future)
   - Manage provider withdrawals
   - Process payouts to provider bank accounts

---

## 4. DETAILED FEATURE BREAKDOWN

### 4.1 Authentication & Authorization

#### Multi-Method Login
1. **Email/Password**
   - bcrypt password hashing
   - JWT token generation (24hr expiry)
   - Refresh token mechanism

2. **Google OAuth 2.0**
   - One-click sign-in
   - Auto-creates user profile
   - Role selection on first login

3. **QR Code Mobile Auth**
   - Generate QR code on web
   - Scan with mobile app
   - Instant session sync
   - Uses JWT in QR payload

4. **WhatsApp OTP**
   - Twilio WhatsApp integration
   - Send 6-digit OTP
   - Verify phone number

#### Role-Based Access Control (RBAC)
- Middleware: `requireAuth`, `requireRole`
- Routes protected by user role
- Customer, Provider, Admin permissions

---

### 4.2 Service Questionnaire & Estimation

#### Dynamic Questionnaire System
Each service category has custom questions:

**Example: Plumbing Service**
```javascript
{
  serviceName: "Plumbing",
  questions: [
    { 
      id: "issue_type",
      question: "What type of plumbing issue?",
      type: "radio",
      options: ["Leak", "Installation", "Blockage", "Repair"],
      priceImpact: { Leak: 200, Installation: 500, Blockage: 300, Repair: 150 }
    },
    {
      id: "urgency",
      question: "How urgent is this?",
      type: "radio",
      options: ["Emergency", "Same Day", "Schedule Later"],
      priceImpact: { Emergency: 200, "Same Day": 100, "Schedule Later": 0 }
    },
    {
      id: "num_fixtures",
      question: "How many fixtures affected?",
      type: "number",
      min: 1,
      max: 10,
      pricePerUnit: 50
    }
  ],
  basePrice: 300,
  visitCharge: 100
}
```

#### Calculation Logic
```javascript
serviceCharge = basePrice + sum(priceImpact) + (numFixtures * pricePerUnit)
visitCharge = 100
platformFee = (serviceCharge + visitCharge) * 0.10
subtotal = serviceCharge + visitCharge
total = subtotal + platformFee

Example:
- basePrice: 300
- Leak: +200
- Emergency: +200
- 3 fixtures: +150
- serviceCharge = 850
- visitCharge = 100
- subtotal = 950
- platformFee = 95
- TOTAL = 1045 INR
```

#### Estimate Storage
- Saved in `Booking.serviceDetails.estimate`
- Shown to customer before booking
- Used for auto-bill generation on completion

---

### 4.3 Intelligent Provider Matching

#### Ranking Algorithm
```javascript
1. Filter available providers:
   - role === "provider"
   - isAvailable === true
   - onboardingStatus === "approved"
   - Has active service for this template

2. Sort by priority:
   PRIMARY: rating (descending)
   SECONDARY: completedJobs count (descending)
   TERTIARY: provider._id (alphabetical, tiebreaker)

3. Create offer queue:
   - First provider gets 2-minute timeout
   - If declined/expired, automatically advance to next
   - Continue until accepted or queue exhausted
```

#### Offer Expiry Mechanism
- Each offer has `providerResponseTimeout` timestamp
- Backend checks every minute for expired offers
- Auto-advances to next provider in queue
- Customer sees: "Waiting for provider response..."

#### Fallback Behavior
- If all providers decline: 
  - Booking stays "requested"
  - Customer can cancel or wait
  - Admin can manually assign

---

### 4.4 Real-Time Tracking

#### Provider Location Updates
**Provider sends GPS coordinates:**
```javascript
POST /api/providers/update-location
{
  lng: 78.5569,  // Longitude
  lat: 17.4399,  // Latitude (KMIT, Hyderabad)
  bookingId: "64f8a9c2..." // Current active booking
}
```

**Backend updates:**
```javascript
// Update provider's global location
User.location = { type: "Point", coordinates: [lng, lat] }

// Update booking's provider position
Booking.providerLocation = { type: "Point", coordinates: [lng, lat] }
Booking.providerLastUpdate = new Date()

// Calculate distance from customer
const distance = haversineDistance(providerCoords, customerCoords)
Booking.distanceFromCustomer = distance
```

#### Customer Tracking View
**Polling mechanism:**
```javascript
// Every 10 seconds
GET /api/bookings/{bookingId}/tracking

Response:
{
  provider: { lat: 17.4399, lng: 78.5569, lastUpdate: "2025-10-29T10:30:45Z" },
  customer: { lat: 17.4299, lng: 78.5469 },  // ~2km from KMIT
  distanceKm: 2.15,
  etaMinutes: 6,  // Based on avgSpeed = 20 km/h
  stale: false    // true if no update in 30s
}
```

#### Map Visualization (Leaflet)
- **Provider marker**: Blue pin (start point)
- **Customer marker**: Red pin (destination)
- **Route line**: Blue polyline connecting both
- **Auto-centering**: Fits both markers in view
- **Live updates**: Recenters as provider moves
- **Fallback**: If provider location unavailable, shows last known User.location

#### ETA Calculation
```javascript
distanceKm = haversineDistance(providerCoords, customerCoords)
avgSpeedKmH = 20  // Urban traffic assumption
etaMinutes = Math.ceil((distanceKm / avgSpeedKmH) * 60)

Example: 2 km → 6 minutes
```

---

### 4.5 Billing & Payment System

#### Auto-Bill Generation
**On completion:**
```javascript
if (booking.serviceDetails.estimate && !booking.billDetails) {
  billDetails = {
    serviceCharges: estimate.serviceCharge,
    extraFees: estimate.visitCharge,
    discount: 0,
    tax: 0,
    subtotal: estimate.subtotal,
    total: estimate.total,
    notes: "Bill generated from initial estimate",
    generatedAt: new Date(),
    generatedBy: providerId
  }
  booking.paymentStatus = "billed"
  provider.pendingEarnings += total
}
```

#### Manual Bill Generation
Provider can override if estimate differs:
```javascript
POST /api/billing/{bookingId}/generate-bill
{
  serviceCharges: 1200,
  extraFees: 150,
  discount: 50,
  tax: 5,  // percentage
  notes: "Additional parts required"
}

Calculation:
subtotal = 1200 + 150 - 50 = 1300
taxAmount = 1300 * 0.05 = 65
total = 1365 INR
```

#### Payment Processing

**Option 1: Razorpay (Online)**
```javascript
1. Customer clicks "Pay Online"
2. Frontend creates order on server:
   POST /api/payments/create-order
   { amount: 1365 }
   
3. Server creates Razorpay order:
   const razorpay = new Razorpay({ key_id, key_secret })
   const order = await razorpay.orders.create({
     amount: 136500,  // paise (1365 * 100)
     currency: "INR",
     receipt: "rcpt_1698580245000"
   })
   
4. Frontend opens Razorpay checkout:
   Razorpay.open({
     key: "rzp_test_RZ9uKkXMiYbEg7",
     order_id: order.id,
     handler: onPaymentSuccess
   })
   
5. After payment, verify signature:
   POST /api/payments/verify
   {
     razorpay_order_id: "order_xyz",
     razorpay_payment_id: "pay_abc",
     razorpay_signature: "hmac_sha256..."
   }
   
   const expected = crypto
     .createHmac("sha256", key_secret)
     .update(`${order_id}|${payment_id}`)
     .digest("hex")
   
   if (expected === signature) ✅ valid
   
6. Mark booking as paid:
   POST /api/billing/{bookingId}/mark-online-paid
   booking.paymentStatus = "paid"
   booking.paymentMethod = "razorpay"
```

**Option 2: Cash Payment**
```javascript
1. Customer clicks "Paid in Cash"
2. Confirms in-person cash payment
3. POST /api/billing/{bookingId}/mark-cash-paid
   booking.paymentStatus = "paid"
   booking.paymentMethod = "cash"
```

#### Transaction Record Creation
```javascript
const transaction = new Transaction({
  transactionId: "TXN12345",
  booking: bookingId,
  customer: customerId,
  provider: providerId,
  amount: 1365,              // Total bill amount
  platformFee: 136.50,       // 10% of total
  providerEarning: 1228.50,  // 90% of total
  paymentMethod: "razorpay",
  paymentStatus: "completed",
  razorpayOrderId: "order_xyz",
  razorpayPaymentId: "pay_abc",
  paidAt: new Date()
})
```

#### Earnings Distribution
```javascript
// On payment completion:
Provider.totalEarnings += 1228.50
Provider.withdrawableBalance += 1228.50
Provider.pendingEarnings -= 1365  // Clear pending

Admin Dashboard:
platformRevenue += 136.50
```

---

### 4.6 Rating & Review System

#### Customer Rates Provider
```javascript
POST /api/reviews/create
{
  booking: bookingId,
  rating: 5,              // 1-5 stars
  comment: "Excellent work, very professional!",
  images: ["url1", "url2"]  // Work photos
}

// Update provider's aggregate rating:
const reviews = await Review.find({ provider: providerId })
const avgRating = sum(reviews.map(r => r.rating)) / reviews.length
Provider.rating = avgRating
Provider.ratingCount = reviews.length
```

#### Review Display
- Shown on provider profile
- Visible during booking selection
- Influences provider ranking

---

### 4.7 Notifications System

#### Types
1. **Email Notifications**
   - Account verification
   - Booking confirmations
   - Bill sent
   - Payment received

2. **In-App Notifications**
   - Real-time alerts
   - Provider offers
   - Status updates

3. **WhatsApp Notifications** (via Twilio)
   - OTP verification
   - Booking reminders
   - Service updates

#### Implementation
```javascript
// Email (Nodemailer + Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'localhands.services@gmail.com',
    pass: 'ffnmpdehczfwrzir'  // App password
  }
})

// WhatsApp (Twilio)
const client = twilio(accountSid, authToken)
await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: 'whatsapp:+919876543210',
  body: 'Your OTP is: 123456'
})
```

---

## 5. DATABASE SCHEMA

### 5.1 User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  phone: String,
  password: String (hashed),
  role: String (customer | provider | admin),
  
  // Provider-specific
  onboardingStatus: String (pending | approved | rejected),
  licenseImage: String (Cloudinary URL),
  licenseType: String (aadhar | pan | driving_license),
  licenseNumber: String,
  verificationSubmittedAt: Date,
  rejectionReason: String,
  
  // Availability
  isAvailable: Boolean,
  isLiveTracking: Boolean,
  location: {
    type: "Point",
    coordinates: [lng, lat]  // GeoJSON
  },
  locationUpdatedAt: Date,
  
  // Earnings (provider)
  totalEarnings: Number (default: 0),
  pendingEarnings: Number (default: 0),
  withdrawableBalance: Number (default: 0),
  completedJobs: Number (default: 0),
  
  // Ratings
  rating: Number (default: 0),
  ratingCount: Number (default: 0),
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

// Indexes
email_1 (unique)
location_2dsphere (geospatial queries)
```

### 5.2 Booking Collection
```javascript
{
  _id: ObjectId,
  bookingId: String (unique, e.g., "O123"),
  
  customer: ObjectId (ref: User),
  provider: ObjectId (ref: User),
  service: ObjectId (ref: Service),
  serviceTemplate: ObjectId (ref: ServiceTemplate),
  serviceCatalog: ObjectId (ref: ServiceCatalog),
  
  // Location
  location: {
    type: "Point",
    coordinates: [lng, lat]  // Customer's service address
  },
  address: String,
  
  // Provider tracking
  providerLocation: {
    type: "Point",
    coordinates: [lng, lat]
  },
  providerLastUpdate: Date,
  distanceFromCustomer: Number,
  
  // Status
  status: String (requested | in_progress | completed | cancelled),
  overallStatus: String (pending | in-progress | completed | expired),
  paymentStatus: String (pending | billed | paid),
  
  // Questionnaire & Estimate
  serviceDetails: {
    answers: [{ questionId, answer }],
    estimate: {
      serviceCharge: Number,
      visitCharge: Number,
      platformFee: Number,
      subtotal: Number,
      total: Number,
      breakdown: Object
    }
  },
  
  // Billing
  billDetails: {
    serviceCharges: Number,
    extraFees: Number,
    discount: Number,
    tax: Number,
    subtotal: Number,
    total: Number,
    notes: String,
    generatedAt: Date,
    generatedBy: ObjectId
  },
  billSentAt: Date,
  
  // Payment
  paymentMethod: String (razorpay | cash),
  paymentDetails: {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    paidAt: Date
  },
  
  // Offer queue (multi-provider)
  offers: [{
    provider: ObjectId,
    status: String (pending | accepted | declined | expired),
    offeredAt: Date,
    respondedAt: Date
  }],
  pendingProviders: [ObjectId],
  providerResponseTimeout: Date,
  pendingExpiresAt: Date,
  
  // Reviews
  reviewStatus: String (pending | provider_pending | customer_pending | completed),
  
  // Timestamps
  scheduledAt: Date,
  acceptedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
bookingId_1 (unique)
customer_1
provider_1
status_1
location_2dsphere
```

### 5.3 Transaction Collection
```javascript
{
  _id: ObjectId,
  transactionId: String (unique, e.g., "TXN456"),
  
  booking: ObjectId (ref: Booking),
  customer: ObjectId (ref: User),
  provider: ObjectId (ref: User),
  
  amount: Number,              // Total bill amount
  platformFee: Number,         // 10% platform fee
  providerEarning: Number,     // 90% provider earning
  
  paymentMethod: String (razorpay | cash),
  paymentStatus: String (completed | pending | failed),
  
  // Razorpay details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  
  paidAt: Date,
  createdAt: Date
}

// Indexes
transactionId_1 (unique)
customer_1
provider_1
booking_1
```

### 5.4 Review Collection
```javascript
{
  _id: ObjectId,
  booking: ObjectId (ref: Booking),
  customer: ObjectId (ref: User),
  provider: ObjectId (ref: User),
  
  rating: Number (1-5),
  comment: String,
  images: [String],  // Work photos
  
  direction: String (customer_to_provider | provider_to_customer),
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes
booking_1
provider_1
customer_1
```

### 5.5 ServiceTemplate Collection
```javascript
{
  _id: ObjectId,
  name: String (e.g., "Plumbing"),
  category: String,
  description: String,
  icon: String,
  
  questionnaire: [{
    id: String,
    question: String,
    type: String (radio | checkbox | number | text),
    options: [String],
    priceImpact: Object,
    pricePerUnit: Number,
    required: Boolean
  }],
  
  basePrice: Number,
  visitCharge: Number,
  active: Boolean,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. API ENDPOINTS

### 6.1 Authentication
```
POST   /api/auth/register          - Email/password registration
POST   /api/auth/login             - Email/password login
POST   /api/auth/google            - Google OAuth login
POST   /api/auth/logout            - Logout current user
GET    /api/auth/me                - Get current user profile
POST   /api/mobile-auth/qr-login   - QR code authentication
POST   /api/mobile-auth/send-otp   - Send WhatsApp OTP
POST   /api/mobile-auth/verify-otp - Verify WhatsApp OTP
```

### 6.2 Bookings
```
POST   /api/bookings/create-with-questionnaire  - Create booking with estimate
POST   /api/bookings/calculate-estimate         - Get price estimate
GET    /api/bookings/mine                       - Get my bookings
GET    /api/bookings/offers/mine                - Get my pending offers (provider)
PATCH  /api/bookings/:id/offer/accept           - Accept booking offer
PATCH  /api/bookings/:id/offer/decline          - Decline booking offer
PATCH  /api/bookings/:id/complete               - Mark booking complete
PATCH  /api/bookings/:id/cancel                 - Cancel booking
GET    /api/bookings/:id/tracking               - Get real-time tracking data
```

### 6.3 Billing & Payments
```
POST   /api/billing/:id/generate-bill           - Generate bill (provider)
GET    /api/billing/:id/bill                    - Get bill details
POST   /api/billing/:id/send-bill               - Send bill to customer
POST   /api/billing/:id/mark-online-paid        - Mark paid via Razorpay
POST   /api/billing/:id/mark-cash-paid          - Mark paid in cash
GET    /api/billing/provider/earnings           - Get provider earnings
GET    /api/billing/customer/payment-history    - Get customer payments
GET    /api/billing/admin/revenue               - Get admin revenue stats

POST   /api/payments/create-order               - Create Razorpay order
POST   /api/payments/verify                     - Verify payment signature
```

### 6.4 Providers
```
POST   /api/providers/submit-license            - Submit license for verification
GET    /api/providers/verification-status       - Get verification status
POST   /api/providers/set-availability          - Toggle go live/offline
POST   /api/providers/update-location           - Update GPS location
GET    /api/providers/track/:id                 - Get provider location
GET    /api/providers/nearby                    - Find nearby providers
```

### 6.5 Reviews
```
POST   /api/reviews/create                      - Create review
GET    /api/reviews/booking/:id                 - Get reviews for booking
GET    /api/reviews/provider/:id                - Get provider reviews
```

### 6.6 Admin
```
GET    /api/admin/providers/pending             - Get pending verifications
PATCH  /api/admin/providers/:id/approve         - Approve provider
PATCH  /api/admin/providers/:id/reject          - Reject provider
GET    /api/admin/bookings                      - Get all bookings
GET    /api/admin/users                         - Get all users
```

---

## 7. KEY ALGORITHMS & BUSINESS LOGIC

### 7.1 Haversine Distance Formula
```javascript
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth radius in km
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng/2) ** 2
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c  // Distance in km
}
```

### 7.2 Platform Fee Calculation
```javascript
// 10% platform fee, 90% provider earning
const platformFeePercent = 0.10
const totalAmount = booking.billDetails.total

const platformFee = totalAmount * platformFeePercent
const providerEarning = totalAmount - platformFee

Example:
Total: 1000 INR
Platform: 100 INR (10%)
Provider: 900 INR (90%)
```

### 7.3 Provider Ranking Score
```javascript
function calculateProviderScore(provider) {
  return {
    rating: provider.rating || 0,           // Primary (0-5)
    experience: provider.completedJobs || 0, // Secondary
    joinedDate: provider.createdAt          // Tertiary (tiebreaker)
  }
}

// Sort: rating DESC, experience DESC, joinedDate ASC
providers.sort((a, b) => {
  if (b.rating !== a.rating) return b.rating - a.rating
  if (b.completedJobs !== a.completedJobs) return b.completedJobs - a.completedJobs
  return a.createdAt - b.createdAt
})
```

---

## 8. DEPLOYMENT & ENVIRONMENT

### 8.1 Backend Deployment
- **Platform**: Render (Node.js service)
- **Database**: MongoDB Atlas (Cloud)
- **Environment Variables**:
  ```
  MONGO_URI=mongodb+srv://...
  JWT_SECRET=mySuperSecretKey123!@#
  RAZORPAY_KEY_ID=rzp_test_RZ9uKkXMiYbEg7
  RAZORPAY_KEY_SECRET=zwtkP0mhywN5uECUg0ILs7yy
  CLOUDINARY_CLOUD_NAME=daoc1mpdc
  CLOUDINARY_API_KEY=324472427889447
  CLOUDINARY_API_SECRET=bVafsyq08LRdMTReQNsEFIPb8Bc
  TWILIO_ACCOUNT_SID=ACe67a4cbefcf8f7b0a2c12ae95e604188
  TWILIO_AUTH_TOKEN=329a4414e946d0362cc70ad20b40c390
  MAIL_USER=localhands.services@gmail.com
  MAIL_PASS=ffnmpdehczfwrzir
  ```

### 8.2 Frontend Deployment
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Environment Variables**:
  ```
  REACT_APP_API_URL=https://localhands-api.onrender.com/api
  REACT_APP_RAZORPAY_KEY_ID=rzp_test_RZ9uKkXMiYbEg7
  REACT_APP_GOOGLE_CLIENT_ID=926733207022-v519rclk1knsgmhj1m90iaqsa72mst5i.apps.googleusercontent.com
  ```

---

## 9. SECURITY FEATURES

### 9.1 Authentication Security
- **Password**: bcrypt hashing (10 salt rounds)
- **JWT**: 24hr expiry, signed with secret
- **HTTPS**: All production traffic encrypted
- **CORS**: Whitelisted origins only

### 9.2 Payment Security
- **Server-side verification**: Razorpay signature validation
- **No client-side secrets**: API keys in environment only
- **Transaction logs**: All payments recorded with IDs

### 9.3 Data Privacy
- **Password never returned**: Excluded in all API responses
- **Role-based access**: Users only see own data
- **Admin oversight**: Logs for sensitive actions

---

## 10. TESTING CREDENTIALS

### Admin
```
Email: admin@gmail.com
Password: admin123
```

### Test Provider (Eshwar)
```
Name: Eshwar
Location: KMIT, Narayanguda, Hyderabad (17.4399, 78.5569)
Services: Plumbing, Electrical
```

### Test Customer (Rajesh)
```
Name: Rajesh
Service Address: 2 km from KMIT (~17.4299, 78.5469)
```

### Razorpay Test Cards
```
Card: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

---

## 11. PRESENTATION TALKING POINTS

### Problem Statement
- **Current Issues**:
  - Difficulty finding verified local service providers
  - No transparent pricing before service
  - Lack of real-time tracking for service providers
  - Payment disputes and delayed settlements
  - No standardized quality assurance

### Solution Highlights
1. **Instant Provider Matching**: AI-based ranking by rating and experience
2. **Transparent Pricing**: Get estimates before booking via questionnaires
3. **Live Tracking**: Real-time GPS tracking with ETA calculation
4. **Secure Payments**: Razorpay integration with signature verification
5. **Quality Assurance**: Verified providers with rating/review system
6. **Fair Economics**: 90% to providers, 10% platform fee

### Market Potential
- **Target Market**: Urban households and small businesses
- **TAM**: 100M+ households in Indian metros
- **Growing Demand**: Shift to on-demand services post-pandemic

### Competitive Advantages
- End-to-end automation (estimate → booking → tracking → payment)
- Multiple authentication methods (Email, Google, QR, WhatsApp)
- Real-time tracking with accurate ETA
- Transparent earnings dashboard for providers

### Future Roadmap
- Mobile apps (iOS/Android)
- Multiple payment gateways
- In-app chat between customer and provider
- Provider payout automation
- Subscription plans for frequent users
- AI-based demand prediction
- Multi-city expansion

---

## 12. SRS SECTIONS QUICK REFERENCE

### 1. Introduction
- **Purpose**: Connect customers with local service providers
- **Scope**: Web platform for booking, tracking, billing
- **Definitions**: Customer, Provider, Admin, Booking, Transaction

### 2. Overall Description
- **Product Perspective**: Standalone web application
- **Product Functions**: User registration, service booking, tracking, payment, reviews
- **User Classes**: Customer, Provider, Admin
- **Operating Environment**: Web browsers, MongoDB, Node.js

### 3. Functional Requirements
- FR1: User shall register with email/Google/QR/WhatsApp
- FR2: Customer shall answer questionnaire to get estimate
- FR3: System shall match customer with best available provider
- FR4: Customer shall track provider in real-time
- FR5: Provider shall generate bill from estimate
- FR6: Customer shall pay via Razorpay or cash
- FR7: System shall distribute earnings (90% provider, 10% platform)
- FR8: Customer shall rate provider after service

### 4. Non-Functional Requirements
- NFR1: Availability 99.5% uptime
- NFR2: Response time < 2 seconds for API calls
- NFR3: Support 10,000 concurrent users
- NFR4: Data encryption in transit and at rest
- NFR5: Mobile-responsive design
- NFR6: GPS accuracy within 50 meters

### 5. System Features
- Multi-method authentication
- Dynamic service questionnaires
- Intelligent provider matching
- Real-time GPS tracking
- Automated billing
- Secure payment processing
- Rating and review system

### 6. External Interface Requirements
- **User Interfaces**: React web app, responsive design
- **Hardware Interfaces**: GPS sensors (mobile)
- **Software Interfaces**: MongoDB, Razorpay, Twilio, Cloudinary
- **Communication Interfaces**: RESTful APIs, WebSockets

### 7. Other Requirements
- **Legal**: GDPR/data protection compliance
- **Scalability**: Horizontal scaling via load balancers
- **Maintainability**: Modular codebase, comprehensive logging

---

## 13. DEMO FLOW FOR PRESENTATION

### Live Demo Script (5-7 minutes)

**Minute 1-2: Customer Flow**
1. Open website → Register/Login with Google
2. Browse service catalog → Select "Plumbing"
3. Answer questionnaire:
   - Issue: Leak
   - Urgency: Emergency
   - Fixtures: 2
4. See instant estimate: ₹1,045
5. Confirm booking → "Searching for provider..."

**Minute 3: Provider Matching**
1. Show provider dashboard (separate tab)
2. Provider receives offer notification
3. Accept offer → Customer notified
4. Provider auto-paused

**Minute 4-5: Live Tracking**
1. Customer clicks "Track Provider"
2. Show map with:
   - Provider at KMIT (start)
   - Customer 2 km away (destination)
   - Blue route line
   - ETA: 6 minutes, Distance: 2 km
3. Simulate provider movement → Map updates

**Minute 6: Billing & Payment**
1. Provider marks job complete
2. Bill auto-generated (₹1,045 from estimate)
3. Customer clicks "Pay Now"
4. Razorpay checkout → Test card payment
5. Payment success → Transaction created

**Minute 7: Dashboard Analytics**
1. Show provider earnings:
   - Withdrawable: ₹940.50 (90%)
   - Transaction history
2. Show admin dashboard:
   - Platform revenue: ₹104.50 (10%)
   - Total transactions
   - Recent bookings

---

## 14. CODE ORGANIZATION

```
LocalHands/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BillViewModal.jsx          # Payment UI
│   │   │   ├── BillGenerationModal.jsx    # Provider billing
│   │   │   ├── TrackingModal.jsx          # Tracking view
│   │   │   ├── TrackingMap.jsx            # Leaflet map
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── CustomerBookings.jsx       # Customer dashboard
│   │   │   ├── ProviderBookings.jsx       # Provider dashboard
│   │   │   ├── AdminDashboard.js          # Admin panel
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── api.js                     # Axios config
│   │   └── App.js                         # Routes
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js          # Login/register
│   │   │   ├── bookingController.js       # Booking logic
│   │   │   ├── billingController.js       # Billing/payments
│   │   │   ├── providerController.js      # Provider actions
│   │   │   └── ...
│   │   ├── models/
│   │   │   ├── User.js                    # User schema
│   │   │   ├── Booking.js                 # Booking schema
│   │   │   ├── Transaction.js             # Transaction schema
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   ├── billingRoutes.js
│   │   │   ├── paymentRoutes.js           # Razorpay
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   └── authMiddleware.js          # JWT verification
│   │   ├── config/
│   │   │   └── db.js                      # MongoDB connection
│   │   ├── app.js                         # Express app
│   │   └── index.js                       # Server entry
│   ├── .env                               # Environment config
│   └── package.json
│
└── PROJECT_DOCUMENTATION.md               # This file
```

---

## 15. CONCLUSION

LocalHands is a comprehensive, production-ready platform that solves real-world problems in the local services market. The combination of intelligent matching, transparent pricing, real-time tracking, and secure payments creates a seamless experience for all stakeholders.

**Key Metrics:**
- **Tech Stack**: Modern (React + Node.js + MongoDB)
- **Security**: Enterprise-grade (JWT + Razorpay + HTTPS)
- **Scalability**: Cloud-native (Vercel + Render + MongoDB Atlas)
- **User Experience**: Intuitive UI with real-time features
- **Business Model**: Sustainable (10% platform fee)

**This documentation provides all the content needed for:**
✅ Software Requirements Specification (SRS)
✅ Technical Presentation
✅ System Design Document
✅ User Manual
✅ Developer Onboarding Guide

---

**Document Version**: 1.0  
**Last Updated**: October 29, 2025  
**Prepared By**: LocalHands Development Team  
**For**: SRS & Presentation Preparation
