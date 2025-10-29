# LocalHands - Quick SRS Template

## 1. INTRODUCTION

### 1.1 Purpose
This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for the LocalHands platform - an on-demand local services marketplace.

### 1.2 Scope
LocalHands enables customers to:
- Find and book verified local service providers (plumbers, electricians, carpenters, etc.)
- Get instant price estimates before booking
- Track service providers in real-time with GPS
- Pay securely via Razorpay or cash
- Rate and review service quality

The platform provides providers with:
- Smart booking matching based on ratings and proximity
- Automated bill generation from service estimates
- Transparent earnings dashboard
- License verification and quality control

### 1.3 Definitions and Acronyms
- **Customer**: End-user requesting a service
- **Provider**: Verified professional offering services
- **Admin**: Platform administrator
- **Booking**: A service request from customer
- **Transaction**: Payment record for completed service
- **ETA**: Estimated Time of Arrival
- **GPS**: Global Positioning System
- **JWT**: JSON Web Token (authentication)
- **API**: Application Programming Interface
- **SRS**: Software Requirements Specification

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
LocalHands is a web-based platform consisting of:
- **Frontend**: React 18 single-page application
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB (NoSQL document database)
- **External Services**: Razorpay (payments), Cloudinary (images), Twilio (SMS/WhatsApp)

### 2.2 Product Functions
Major functions include:
1. User registration and authentication (Email, Google OAuth, QR code, WhatsApp OTP)
2. Service discovery with category-based browsing
3. Dynamic pricing via service-specific questionnaires
4. Intelligent provider matching algorithm
5. Real-time GPS tracking with ETA calculation
6. Automated bill generation from estimates
7. Secure payment processing (Razorpay/Cash)
8. Rating and review system
9. Provider verification workflow
10. Admin analytics dashboard

### 2.3 User Classes and Characteristics
1. **Customer**
   - Tech-savvy urban residents
   - Age: 18-60
   - Needs: Quick, reliable, affordable services
   - Frequency: 2-5 bookings/month

2. **Provider**
   - Skilled professionals (plumbers, electricians, etc.)
   - Age: 22-55
   - Needs: Steady income, fair pricing, flexible schedule
   - Availability: Full-time or part-time

3. **Admin**
   - Platform managers
   - Technical expertise: Moderate
   - Responsibilities: Verification, dispute resolution, analytics

### 2.4 Operating Environment
- **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge)
- **Server**: Node.js v18+ on Linux/Windows
- **Database**: MongoDB 6.0+
- **Deployment**: Vercel (frontend), Render (backend), MongoDB Atlas (database)

### 2.5 Design and Implementation Constraints
- Must use Razorpay for Indian payment processing
- GPS accuracy limited to device capabilities (~10-50m)
- Real-time tracking updates every 10 seconds (network dependent)
- Must comply with Indian data protection laws
- Platform fee fixed at 10% of transaction value

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 User Management

#### FR-1: User Registration
**Description**: System shall allow users to register via multiple methods  
**Input**: Name, email, phone, password, role (customer/provider)  
**Process**: Validate input → Hash password → Create user record → Send verification email  
**Output**: User account created, confirmation email sent  
**Priority**: High

#### FR-2: Email/Password Login
**Description**: Users shall authenticate with email and password  
**Input**: Email, password  
**Process**: Verify credentials → Generate JWT token (24hr expiry)  
**Output**: Access token, user profile  
**Priority**: High

#### FR-3: Google OAuth Login
**Description**: Users shall sign in with Google account  
**Input**: Google authorization code  
**Process**: Verify with Google → Create/retrieve user → Generate JWT  
**Output**: Access token, user profile  
**Priority**: Medium

#### FR-4: QR Code Authentication
**Description**: Users shall login by scanning QR code  
**Input**: QR code payload with JWT  
**Process**: Validate JWT → Create session  
**Output**: Authenticated session  
**Priority**: Low

#### FR-5: WhatsApp OTP Verification
**Description**: System shall verify phone via WhatsApp OTP  
**Input**: Phone number  
**Process**: Generate 6-digit OTP → Send via Twilio WhatsApp → Verify code  
**Output**: Phone verified  
**Priority**: Medium

---

### 3.2 Service Discovery & Booking

#### FR-6: Browse Service Catalog
**Description**: Customers shall view available service categories  
**Input**: None  
**Process**: Fetch active service templates from database  
**Output**: List of services with icons and base pricing  
**Priority**: High

#### FR-7: Service Questionnaire
**Description**: System shall present dynamic questions for each service  
**Input**: Selected service category  
**Process**: Load questionnaire template → Display questions  
**Output**: Question form  
**Priority**: High

#### FR-8: Calculate Estimate
**Description**: System shall calculate price based on questionnaire answers  
**Input**: Questionnaire responses  
**Process**:  
```
serviceCharge = basePrice + sum(priceImpact) + (quantity * pricePerUnit)
visitCharge = 100 (standard)
platformFee = (serviceCharge + visitCharge) * 0.10
total = serviceCharge + visitCharge + platformFee
```
**Output**: Detailed cost breakdown  
**Priority**: High

#### FR-9: Create Booking
**Description**: Customer shall create booking with estimate  
**Input**: Service, location (lat/lng), schedule time, questionnaire answers  
**Process**: Generate unique booking ID → Save with estimate → Trigger provider matching  
**Output**: Booking confirmation, status "searching"  
**Priority**: High

#### FR-10: Intelligent Provider Matching
**Description**: System shall find and assign best provider  
**Input**: Booking location, service type  
**Process**:  
1. Find available providers with matching service
2. Rank by: Rating (desc) → Completed jobs (desc) → Join date (asc)
3. Send offer to top provider (2-minute timeout)
4. If declined/expired, advance to next provider
**Output**: Provider assigned OR queue exhausted  
**Priority**: High

---

### 3.3 Provider Management

#### FR-11: Provider Onboarding
**Description**: Providers shall submit verification documents  
**Input**: License image, type (Aadhar/PAN/DL), number  
**Process**: Upload to Cloudinary → Save URL → Set status "pending"  
**Output**: Verification submitted  
**Priority**: High

#### FR-12: Admin Verification
**Description**: Admin shall approve/reject provider applications  
**Input**: Provider ID, decision (approve/reject), reason (if reject)  
**Process**: Update onboarding status → Send notification email  
**Output**: Provider approved/rejected  
**Priority**: High

#### FR-13: Toggle Availability
**Description**: Provider shall go live/offline  
**Input**: isAvailable (true/false), GPS location (if going live)  
**Process**: 
- Check if approved
- Verify no active bookings
- Update availability and location
**Output**: Provider status updated  
**Priority**: High

#### FR-14: Accept/Decline Booking Offer
**Description**: Provider shall respond to booking offers  
**Input**: Booking ID, action (accept/decline)  
**Process**:  
- **Accept**: Assign provider → Change status to "in_progress" → Pause provider availability  
- **Decline**: Move to next provider in queue  
**Output**: Booking accepted/declined  
**Priority**: High

---

### 3.4 Real-Time Tracking

#### FR-15: Update Provider Location
**Description**: Provider app shall send GPS coordinates  
**Input**: Booking ID, latitude, longitude  
**Process**:  
1. Update User.location (provider's global position)
2. Update Booking.providerLocation (for this booking)
3. Calculate distance from customer using Haversine formula
4. Broadcast via Socket.io (if enabled)
**Output**: Location updated, distance calculated  
**Priority**: High

#### FR-16: Get Tracking Data
**Description**: Customer shall view real-time provider location  
**Input**: Booking ID  
**Process**:  
1. Fetch provider and customer coordinates
2. Calculate distance (Haversine)
3. Calculate ETA (distance / 20 km/h * 60 min)
4. Check if stale (>30s since last update)
**Output**: { provider: {lat, lng}, customer: {lat, lng}, distanceKm, etaMinutes, stale }  
**Priority**: High

#### FR-17: Display Tracking Map
**Description**: Frontend shall render interactive map  
**Input**: Tracking data  
**Process**:  
- Use Leaflet.js to render OpenStreetMap
- Place provider marker (blue pin)
- Place customer marker (red pin)
- Draw route polyline
- Auto-fit bounds to show both
- Re-center on provider as they move
**Output**: Interactive map with live updates  
**Priority**: Medium

---

### 3.5 Billing & Payments

#### FR-18: Auto-Generate Bill
**Description**: System shall create bill on service completion  
**Input**: Booking ID (when marked complete)  
**Process**:  
```
if (booking.estimate exists) {
  billDetails = {
    serviceCharges: estimate.serviceCharge,
    extraFees: estimate.visitCharge,
    subtotal: estimate.subtotal,
    total: estimate.total
  }
  booking.paymentStatus = "billed"
  provider.pendingEarnings += total
}
```
**Output**: Bill generated  
**Priority**: High

#### FR-19: Manual Bill Generation
**Description**: Provider shall manually create bill if needed  
**Input**: Service charges, extra fees, discount, tax %, notes  
**Process**: Calculate subtotal and total → Save to booking → Update pending earnings  
**Output**: Bill created  
**Priority**: Medium

#### FR-20: Create Razorpay Order
**Description**: Backend shall create payment order  
**Input**: Amount (INR)  
**Process**:  
```javascript
const razorpay = new Razorpay({ key_id, key_secret })
const order = await razorpay.orders.create({
  amount: amount * 100,  // Convert to paise
  currency: "INR",
  receipt: "rcpt_" + timestamp
})
```
**Output**: Order ID, amount  
**Priority**: High

#### FR-21: Process Online Payment
**Description**: Customer shall pay via Razorpay  
**Input**: Order ID, payment details  
**Process**:  
1. Frontend opens Razorpay checkout
2. Customer completes payment
3. Razorpay returns payment_id, order_id, signature
4. Backend verifies signature (HMAC-SHA256)
5. If valid, mark booking paid
**Output**: Payment verified, booking status = "paid"  
**Priority**: High

#### FR-22: Process Cash Payment
**Description**: Customer shall confirm cash payment  
**Input**: Booking ID, confirmation  
**Process**: Mark booking.paymentStatus = "paid", paymentMethod = "cash"  
**Output**: Cash payment recorded  
**Priority**: Medium

#### FR-23: Create Transaction Record
**Description**: System shall log all payments  
**Input**: Booking, amount, payment method  
**Process**:  
```javascript
platformFee = amount * 0.10
providerEarning = amount * 0.90

Transaction.create({
  transactionId: "TXN" + counter,
  booking, customer, provider,
  amount, platformFee, providerEarning,
  paymentMethod, paymentStatus: "completed"
})
```
**Output**: Transaction saved  
**Priority**: High

#### FR-24: Update Earnings
**Description**: System shall distribute payment on completion  
**Input**: Transaction details  
**Process**:  
```javascript
Provider.totalEarnings += providerEarning
Provider.withdrawableBalance += providerEarning
Provider.pendingEarnings -= amount
```
**Output**: Earnings updated  
**Priority**: High

---

### 3.6 Rating & Reviews

#### FR-25: Submit Review
**Description**: Customer shall rate provider after payment  
**Input**: Booking ID, rating (1-5), comment, photos  
**Process**: Create Review record → Update provider aggregate rating  
**Output**: Review saved  
**Priority**: Medium

#### FR-26: Calculate Provider Rating
**Description**: System shall maintain provider average rating  
**Input**: New review  
**Process**:  
```javascript
reviews = Review.find({ provider: providerId })
avgRating = sum(reviews.map(r => r.rating)) / reviews.length
Provider.rating = avgRating
Provider.ratingCount = reviews.length
```
**Output**: Provider rating updated  
**Priority**: Medium

---

### 3.7 Admin Features

#### FR-27: View Dashboard Analytics
**Description**: Admin shall view platform metrics  
**Input**: None  
**Process**: Aggregate:  
- Total platform revenue (sum of platformFees)
- Total provider earnings
- Number of transactions
- Total amount processed
**Output**: Revenue dashboard  
**Priority**: Medium

#### FR-28: Manage Providers
**Description**: Admin shall view and control providers  
**Input**: Filters (status, rating)  
**Process**: Fetch providers with filters → Display list  
**Output**: Provider management table  
**Priority**: Medium

#### FR-29: Monitor Bookings
**Description**: Admin shall oversee all bookings  
**Input**: Filters (status, date range)  
**Process**: Fetch bookings → Display with details  
**Output**: Booking list  
**Priority**: Low

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance

#### NFR-1: Response Time
**Requirement**: API responses shall complete within 2 seconds under normal load  
**Measurement**: Average response time measured via monitoring tools  
**Priority**: High

#### NFR-2: Throughput
**Requirement**: System shall handle 10,000 concurrent users  
**Measurement**: Load testing with concurrent requests  
**Priority**: Medium

#### NFR-3: Database Query Time
**Requirement**: 95% of database queries shall complete in <500ms  
**Measurement**: Database profiling and monitoring  
**Priority**: Medium

#### NFR-4: Map Load Time
**Requirement**: Tracking map shall render within 1 second  
**Measurement**: Frontend performance profiling  
**Priority**: Low

### 4.2 Availability

#### NFR-5: Uptime
**Requirement**: System shall maintain 99.5% uptime  
**Measurement**: (Total time - Downtime) / Total time  
**Priority**: High

#### NFR-6: Disaster Recovery
**Requirement**: Database backups shall be created daily and retained for 30 days  
**Measurement**: Backup logs verification  
**Priority**: High

### 4.3 Security

#### NFR-7: Password Security
**Requirement**: User passwords shall be hashed using bcrypt with 10 salt rounds  
**Measurement**: Code review  
**Priority**: High

#### NFR-8: JWT Expiry
**Requirement**: Authentication tokens shall expire after 24 hours  
**Measurement**: Token validation testing  
**Priority**: High

#### NFR-9: HTTPS Encryption
**Requirement**: All production traffic shall use HTTPS/TLS 1.2+  
**Measurement**: SSL certificate verification  
**Priority**: High

#### NFR-10: Payment Security
**Requirement**: Razorpay signatures shall be verified server-side using HMAC-SHA256  
**Measurement**: Code review and payment testing  
**Priority**: High

#### NFR-11: Data Privacy
**Requirement**: User passwords shall never be returned in API responses  
**Measurement**: API testing and code review  
**Priority**: High

### 4.4 Usability

#### NFR-12: Mobile Responsiveness
**Requirement**: UI shall be fully functional on screens 320px-1920px wide  
**Measurement**: Manual testing on devices  
**Priority**: High

#### NFR-13: Browser Compatibility
**Requirement**: System shall work on Chrome, Firefox, Safari, Edge (latest 2 versions)  
**Measurement**: Cross-browser testing  
**Priority**: High

#### NFR-14: Accessibility
**Requirement**: UI shall support keyboard navigation  
**Measurement**: Manual accessibility testing  
**Priority**: Low

### 4.5 Scalability

#### NFR-15: Horizontal Scaling
**Requirement**: Backend shall support horizontal scaling via load balancer  
**Measurement**: Deployment architecture review  
**Priority**: Medium

#### NFR-16: Database Indexing
**Requirement**: All frequently queried fields shall have database indexes  
**Measurement**: Database schema review  
**Priority**: High

### 4.6 Maintainability

#### NFR-17: Code Documentation
**Requirement**: All API endpoints shall have JSDoc comments  
**Measurement**: Code review  
**Priority**: Low

#### NFR-18: Error Logging
**Requirement**: All errors shall be logged with timestamp and stack trace  
**Measurement**: Log file verification  
**Priority**: Medium

#### NFR-19: Modular Architecture
**Requirement**: Code shall follow MVC pattern with separate routes, controllers, models  
**Measurement**: Code structure review  
**Priority**: High

### 4.7 Reliability

#### NFR-20: GPS Accuracy
**Requirement**: Provider location shall be accurate within 50 meters  
**Measurement**: Field testing with known coordinates  
**Priority**: Medium

#### NFR-21: Payment Retry
**Requirement**: Failed Razorpay payments shall allow customer retry  
**Measurement**: Payment flow testing  
**Priority**: High

### 4.8 Compliance

#### NFR-22: Data Protection
**Requirement**: System shall comply with Indian IT Act 2000 for data privacy  
**Measurement**: Legal review  
**Priority**: High

#### NFR-23: PCI Compliance
**Requirement**: Payment processing shall not store card details (delegated to Razorpay)  
**Measurement**: Code review  
**Priority**: High

---

## 5. EXTERNAL INTERFACE REQUIREMENTS

### 5.1 User Interfaces

#### UI-1: Customer Dashboard
- Service catalog grid with icons
- Active bookings list with status badges
- Payment history table
- Tracking modal with map

#### UI-2: Provider Dashboard
- Go Live toggle button with location
- Pending offers with countdown timer
- Active bookings with customer details
- Earnings summary cards (total, pending, withdrawable)

#### UI-3: Admin Panel
- Analytics dashboard with revenue metrics
- Provider verification queue
- Booking monitoring table
- Transaction history

#### UI-4: Tracking Map
- Leaflet-based interactive map
- Provider marker (blue) with "Start" label
- Customer marker (red) with "Destination" label
- Route polyline
- ETA and distance display
- "View in Google Maps" link

### 5.2 Hardware Interfaces

#### HW-1: GPS Sensor
- Interface: HTML5 Geolocation API
- Input: Latitude, Longitude coordinates
- Accuracy: Best available (typically 5-50m)
- Used for: Provider location updates, customer address selection

#### HW-2: Camera (Mobile)
- Interface: HTML5 MediaDevices API
- Input: QR code image, license photo
- Used for: QR authentication, document upload

### 5.3 Software Interfaces

#### SW-1: MongoDB Database
- Version: 6.0+
- Connection: Mongoose ODM
- Protocol: MongoDB Wire Protocol
- Port: 27017 (Atlas default)
- Data exchanged: JSON documents

#### SW-2: Razorpay Payment Gateway
- API Version: v1
- Protocol: HTTPS REST
- Authentication: API Key + Secret
- Endpoints:
  - POST /orders (create order)
  - Webhook for payment status
- Data format: JSON

#### SW-3: Cloudinary Image Service
- API Version: v1.1
- Protocol: HTTPS REST
- Authentication: Cloud name + API Key + Secret
- Endpoints:
  - POST /upload (image upload)
- Data format: Multipart form data, JSON response

#### SW-4: Twilio WhatsApp API
- API Version: 2010-04-01
- Protocol: HTTPS REST
- Authentication: Account SID + Auth Token
- Endpoint: POST /Messages.json
- Data format: Form-encoded, JSON response

#### SW-5: Google OAuth 2.0
- API Version: v2
- Protocol: HTTPS REST
- Authentication: Client ID + Client Secret
- Endpoints:
  - GET /auth (authorization)
  - POST /token (token exchange)
- Data format: JSON

#### SW-6: Gmail SMTP (Nodemailer)
- Protocol: SMTP over TLS
- Server: smtp.gmail.com
- Port: 587
- Authentication: Email + App Password
- Used for: Verification emails, notifications

### 5.4 Communication Interfaces

#### COM-1: REST API
- Protocol: HTTP/HTTPS
- Port: 5000 (dev), 443 (production)
- Data format: JSON
- Authentication: Bearer JWT token in Authorization header
- CORS: Enabled for whitelisted origins

#### COM-2: WebSocket (Socket.io)
- Protocol: WebSocket over HTTP
- Port: Same as REST API
- Events:
  - provider:location (real-time location updates)
  - booking:status (status changes)
- Authentication: JWT token

#### COM-3: Frontend-Backend Communication
- Method: Axios HTTP client
- Base URL: Environment variable REACT_APP_API_URL
- Error handling: Try-catch with user-friendly messages
- Retry logic: None (user-initiated retry)

---

## 6. DATA REQUIREMENTS

### 6.1 Logical Data Model

#### Entities and Relationships
```
User (1) ----< (M) Booking
User (Provider) (1) ----< (M) Transaction
User (Customer) (1) ----< (M) Transaction
Booking (1) ----< (1) Transaction
ServiceTemplate (1) ----< (M) Booking
Booking (1) ----< (M) Review
```

### 6.2 Data Dictionary

**User Table**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Unique identifier |
| email | String | Unique, Indexed | User email |
| password | String | Hashed | bcrypt hash |
| role | String | Enum | customer, provider, admin |
| rating | Number | 0-5 | Average rating (providers) |
| totalEarnings | Number | Default 0 | Lifetime earnings (providers) |
| location | GeoJSON | 2dsphere Index | GPS coordinates |

**Booking Table**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Unique identifier |
| bookingId | String | Unique | Human-readable ID (O123) |
| customer | ObjectId | FK → User | Customer reference |
| provider | ObjectId | FK → User | Provider reference |
| status | String | Enum | requested, in_progress, completed |
| paymentStatus | String | Enum | pending, billed, paid |
| serviceDetails.estimate | Object | | Price estimate |
| billDetails | Object | | Final bill |
| location | GeoJSON | 2dsphere | Service address |

**Transaction Table**
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | PK | Unique identifier |
| transactionId | String | Unique | TXN12345 |
| booking | ObjectId | FK → Booking | Booking reference |
| amount | Number | Required | Total amount |
| platformFee | Number | Calculated | 10% of amount |
| providerEarning | Number | Calculated | 90% of amount |
| paymentMethod | String | Enum | razorpay, cash |

### 6.3 Data Retention

**Retention Policy**
- Active bookings: Indefinite (until completed/cancelled)
- Completed bookings: 3 years
- Transactions: 7 years (tax compliance)
- User accounts: Until user requests deletion
- Reviews: Indefinite (with booking)
- Logs: 90 days

**Backup Schedule**
- Database: Daily full backup at 2 AM IST
- Retention: 30 daily backups, 12 monthly backups
- Storage: MongoDB Atlas automated backups

---

## 7. USE CASE DIAGRAMS

### Use Case 1: Book Service

**Actors**: Customer, Provider (assigned by system)

**Preconditions**: Customer is logged in

**Main Flow**:
1. Customer browses service catalog
2. Customer selects service type
3. System displays questionnaire
4. Customer answers questions
5. System calculates and displays estimate
6. Customer confirms booking
7. System finds best available provider
8. System sends offer to provider
9. Provider accepts offer
10. System notifies customer

**Postconditions**: Booking created, provider assigned, status "in_progress"

**Alternative Flows**:
- 9a. Provider declines → System advances to next provider
- 9b. Provider timeout (2 min) → System advances to next provider
- 9c. No providers available → Booking stays "requested", customer notified

---

### Use Case 2: Track Provider

**Actors**: Customer, Provider (via GPS updates)

**Preconditions**: Booking status is "in_progress"

**Main Flow**:
1. Customer clicks "Track Provider"
2. System fetches latest provider location
3. System calculates distance and ETA
4. System displays map with markers and route
5. System polls for updates every 10 seconds
6. Map updates as provider moves

**Postconditions**: Customer sees real-time provider location

**Alternative Flows**:
- 2a. Provider location unavailable → Show last known location
- 2b. No GPS data → Display message "Waiting for location..."

---

### Use Case 3: Process Payment

**Actors**: Customer, Razorpay (external), Provider

**Preconditions**: Booking status is "completed", bill generated

**Main Flow**:
1. Customer clicks "Pay Now"
2. System displays bill details
3. Customer selects "Pay Online (Razorpay)"
4. System creates Razorpay order on backend
5. System opens Razorpay checkout popup
6. Customer enters card details
7. Razorpay processes payment
8. Razorpay returns payment signature
9. System verifies signature
10. System marks booking as paid
11. System creates transaction record
12. System updates provider earnings

**Postconditions**: Payment completed, provider gets 90%, platform gets 10%

**Alternative Flows**:
- 3a. Customer selects "Paid in Cash" → Skip steps 4-9, go to 10
- 9a. Signature invalid → Show error, allow retry
- 7a. Payment fails → Allow retry

---

## 8. SYSTEM CONSTRAINTS

### 8.1 Technical Constraints
- Must use MongoDB (NoSQL) - relational DB not supported
- Limited to Razorpay for payments (Indian market)
- GPS accuracy depends on device hardware
- Real-time updates limited by network latency

### 8.2 Business Constraints
- Platform fee fixed at 10%
- Provider must be approved before going live
- Customer cannot cancel booking after provider starts work
- Payment required before review submission

### 8.3 Regulatory Constraints
- Must comply with Indian IT Act 2000
- Payment data handling per PCI DSS (delegated to Razorpay)
- User data retention subject to deletion requests

---

## 9. ASSUMPTIONS AND DEPENDENCIES

### 9.1 Assumptions
- Users have smartphones with GPS and internet
- Providers have reliable transportation to reach customers
- Average urban travel speed is 20 km/h (for ETA)
- Network connectivity is available during service
- Users provide accurate location information

### 9.2 Dependencies
- **External APIs**:
  - Razorpay (if down, payments fail)
  - Cloudinary (if down, image uploads fail)
  - Twilio (if down, WhatsApp OTP fails)
  - Google OAuth (if down, Google login fails)
  
- **Third-Party Libraries**:
  - React, Express, Mongoose (version compatibility)
  - Leaflet.js (for maps)
  
- **Infrastructure**:
  - Vercel availability (frontend hosting)
  - Render availability (backend hosting)
  - MongoDB Atlas availability (database)

---

## 10. APPENDICES

### Appendix A: Glossary
- **Haversine Formula**: Algorithm to calculate distance between two GPS coordinates
- **JWT**: Stateless authentication token containing user claims
- **GeoJSON**: Standard format for geographic data structures
- **HMAC**: Hash-based Message Authentication Code (signature verification)
- **bcrypt**: Password hashing algorithm with salt

### Appendix B: Test Credentials
```
Admin:
  Email: admin@gmail.com
  Password: admin123

Test Provider:
  Name: Eshwar
  Location: KMIT, Hyderabad (17.4399, 78.5569)

Test Customer:
  Name: Rajesh
  Address: 2 km from KMIT

Razorpay Test Card:
  Number: 4111 1111 1111 1111
  CVV: Any 3 digits
  Expiry: Any future date
```

### Appendix C: API Base URLs
```
Development:
  Frontend: http://localhost:3000
  Backend: http://localhost:5000/api

Production:
  Frontend: https://local-hands-01.vercel.app
  Backend: https://localhands-api.onrender.com/api
```

---

**End of SRS Document**

**Version**: 1.0  
**Date**: October 29, 2025  
**Prepared By**: LocalHands Development Team  
**Approved By**: [Project Manager Name]  
**Document Status**: Final
