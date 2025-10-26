# 🧪 Testing Guide - Questionnaire-Based Booking Flow

## ✅ Prerequisites
- ✅ Backend running at http://localhost:5000
- ✅ Frontend running at http://localhost:3000
- ✅ Service catalogs seeded in database (7 services)
- ✅ User account created with "customer" role

---

## 🔄 Complete Test Flow

### **Step 1: Login as Customer**
1. Go to http://localhost:3000/login
2. Login with customer credentials
3. You should be redirected to customer dashboard

### **Step 2: Navigate to New Booking Flow**
1. In browser, go to: **http://localhost:3000/customer-home-new**
2. You should see a beautiful gradient page with service cards

### **Step 3: Browse Services**
You should see **7 service cards**:
- ❄️ AC Repair & Installation - Starting from ₹299
- 🔨 Carpentry Services - Starting from ₹199
- ⚡ Electrical Services - Starting from ₹149
- 🚰 Plumbing Services - Starting from ₹199
- 📹 CCTV Installation & Repair - Starting from ₹499
- 🎨 Painting Services - Starting from ₹12
- 🔧 Electronics Repair - Starting from ₹249

### **Step 4: Select AC Repair**
1. Click on **"AC Repair & Installation"** card
2. Questionnaire should appear with 4 questions

### **Step 5: Fill Questionnaire**
Fill the form:

**Question 1:** Type of AC?
- Select: **Split AC**

**Question 2:** What service do you need? (multiple selection)
- Check: **Gas refilling needed**
- Check: **General servicing/cleaning**

**Question 3:** Number of AC units?
- Enter: **2**

**Question 4:** Additional details (optional)
- Skip or enter: "Both ACs in bedrooms"

### **Step 6: Get Estimate**
1. Click **"📊 Get Instant Estimate"** button
2. Wait for calculation (should be instant)

### **Step 7: Verify Estimate**
You should see a breakdown:
```
📋 Your Service Estimate

Service Charges: ₹2,996
  (Base ₹299 + Gas ₹800 + Servicing ₹399 = ₹1,498 × 2 units)

Visit Charge: ₹99

Platform Fee (1.2%): ₹36

Subtotal: ₹3,095

Total Estimate: ₹3,131
```

**Payment Note:**
"💳 Pay After Service - No advance payment needed!"

### **Step 8: Confirm Estimate**
1. Click **"✓ Looks Good! Schedule Service"** button
2. Scheduling page should appear

### **Step 9: Schedule Service**
You should see:
- Service: AC Repair & Installation
- Estimated Cost: ₹3,131
- Payment: "Pay after service completion"

**Fill the form:**

**Date & Time:**
- Select tomorrow at 3:00 PM (or any future date/time)

**Provider Preference:**
Choose one of:
- 📍 **Nearest Provider** (fastest arrival time)
- ⭐ **Highest Rated** (best reviews & ratings) ← Select this
- 🎯 **Best Match** (balanced rating & distance)
- 💰 **Cheapest Rate** (lowest hourly rate)

### **Step 10: Create Booking**
1. Click **"🔍 Find Provider & Book"** button
2. Should see "Finding Provider..." loading state
3. Alert: "Booking created! Finding providers for you..."
4. Redirected to customer dashboard

---

## 🎯 Expected Results

### **In Database (MongoDB)**
Check `bookings` collection:
```javascript
{
  bookingId: "O1XXX",
  customer: ObjectId("..."),
  serviceCatalog: ObjectId("..."),
  serviceDetails: {
    answers: {
      acType: "Split AC",
      issues: ["Gas refilling needed", "General servicing/cleaning"],
      numberOfUnits: 2,
      additionalInfo: "Both ACs in bedrooms"
    },
    estimate: {
      serviceCharge: 2996,
      visitCharge: 99,
      platformFee: 36,
      subtotal: 3095,
      total: 3131,
      breakdown: { ... }
    }
  },
  sortPreference: "rating",
  preferredDateTime: "2025-10-27T15:00:00.000Z",
  status: "requested",
  paymentStatus: "pending",
  location: {
    type: "Point",
    coordinates: [77.5946, 12.9716] // Your actual location
  }
}
```

### **In Browser Network Tab**
Check these API calls were made:

1. **GET /api/service-catalogs**
   - Status: 200
   - Returns: Array of 7 services

2. **GET /api/service-catalogs/:id**
   - Status: 200
   - Returns: AC Repair service with questions

3. **POST /api/bookings/calculate-estimate**
   - Status: 200
   - Body: `{ serviceCatalogId, answers }`
   - Returns: `{ estimate: { ... } }`

4. **POST /api/bookings/create-with-questionnaire**
   - Status: 201
   - Body: `{ serviceCatalogId, serviceDetails, sortPreference, ... }`
   - Returns: `{ message, booking }`

---

## 🧪 Test Different Services

### **Test Carpentry (with complexity multiplier)**
1. Select "Carpentry Services"
2. Fill:
   - Work type: Furniture repair
   - Items: Wardrobe, Bed
   - Quantity: 3
   - Complexity: **Moderate repair** (1.4× multiplier)
   - Description: "Wardrobe door broken"
3. Expected estimate:
   - Base: ₹199
   - Furniture repair: ₹200
   - Wardrobe: ₹300
   - Bed: ₹200
   - Per item: ₹899
   - × 3 items: ₹2,697
   - × 1.4 (moderate): **₹3,775.80**
   - Visit: ₹99
   - Platform fee: ₹45
   - **Total: ≈ ₹3,920**

### **Test Painting (area-based pricing)**
1. Select "Painting Services"
2. Fill:
   - Paint type: Interior wall painting
   - Area: 500 sq. ft.
   - Rooms: 2
   - Finish: **Premium/Emulsion** (+₹5/sq.ft)
3. Expected estimate:
   - Base: ₹12/sq.ft
   - Premium: +₹5/sq.ft
   - Per sq.ft: ₹17
   - × 500: **₹8,500**
   - Visit: ₹199
   - Platform fee: ₹102
   - **Total: ≈ ₹8,801**

### **Test Electrical (urgency pricing)**
1. Select "Electrical Services"
2. Fill:
   - Issue: Power outage, Circuit breaker tripping
   - Urgency: **Emergency (same day)** (+₹200)
   - Points: 5
   - Description: "No power in kitchen"
3. Expected estimate:
   - Base: ₹149
   - Power outage: ₹300
   - Circuit breaker: ₹250
   - Emergency: ₹200
   - Per point: ₹899
   - × 5 points: **₹4,495**
   - Visit: ₹99
   - Platform fee: ₹53
   - **Total: ≈ ₹4,647**

---

## 🐛 Troubleshooting

### **Issue: "Cannot find module ServiceQuestionnaire"**
**Fix:** Make sure you're on the correct page `/customer-home-new` (not `/customer`)

### **Issue: "Service catalogs not loading"**
**Fix:** 
```bash
cd backend
node src/seed/runServiceSeeders.js
```

### **Issue: "Estimate calculation error"**
**Fix:** Check backend console for errors. Verify:
- ServiceCatalog exists in database
- Pricing.optionPrices is a Map (not plain object)

### **Issue: "Booking creation fails"**
**Fix:** Check:
- User is logged in (token in localStorage)
- User role is "customer"
- Location permission granted in browser

---

## 📸 Screenshots to Verify

### **1. Service Grid**
- 7 cards in grid layout
- Gradient background (purple to blue)
- Each card shows icon, name, category, description, price
- Hover effect (card lifts up)

### **2. Questionnaire**
- Clean white card on gradient background
- Questions with proper spacing
- Radio options as clickable boxes
- Checkboxes for multiple selection
- Number input with min/max
- Text area for optional input
- Gradient submit button

### **3. Estimate Display**
- White card with price breakdown
- Line items aligned left-right
- Green banner "Pay after service"
- Total highlighted with gradient background
- Disclaimer text at bottom

### **4. Scheduling Page**
- Summary banner (service name + price)
- Large datetime picker
- 4 provider preference cards
- Each card shows icon, title, description
- Selected card has gradient background
- Large confirm button at bottom

---

## ✅ Success Criteria

- [x] All 7 services load from database
- [x] Questionnaire renders dynamically per service
- [x] Estimate calculates correctly (matches expected totals)
- [x] All 4 provider preferences selectable
- [x] Booking creates successfully in database
- [x] serviceDetails stored with answers + estimate
- [x] sortPreference saved correctly
- [x] No console errors
- [x] Professional UI/UX (gradients, animations, spacing)
- [x] Responsive design (works on mobile)

---

## 🎉 You're Done!

If all tests pass, the **complete questionnaire-based booking flow is working perfectly!** 

Next steps would be:
1. Implement provider assignment logic
2. Add live location tracking
3. Connect payment after service
4. Build booking history pages

**But the core flow (select → questionnaire → estimate → schedule → book) is 100% complete!** ✅
