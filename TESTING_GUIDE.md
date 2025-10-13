# 🧪 Quick Testing Guide - Chat & Call Features

## 🚀 Start Testing in 5 Minutes

### **Step 1: Start Backend Server**
```bash
cd backend
npm start
```

**Expected Output:**
```
✅ MongoDB connected successfully
✅ Socket.IO ready for real-time chat on port 5000
✅ Server listening on port 5000
```

---

### **Step 2: Start Frontend Server**
```bash
cd frontend
npm start
```

**Expected Output:**
```
✅ Webpack compiled successfully
✅ Server running at http://localhost:3000
```

---

### **Step 3: Test Profile Settings**

1. **Login** as any user (customer or provider)
2. **Navigate** to `/settings` or add "Profile Settings" link to navbar
3. **Update:**
   - Name: "Test User"
   - Phone: "1234567890"
   - Alternate Phone: "9876543210" ← **This is used for calls**
   - (If provider) Select languages: English, Hindi, Telugu
4. **Click "Save Changes"**
5. **Verify:** Green success message appears

**Debug if fails:**
```javascript
// Check browser console for errors
// Check network tab for API response
// Check backend logs for updateProfile errors
```

---

### **Step 4: Test Socket.IO Connection**

1. **Login** as any user
2. **Open browser console** (F12 → Console tab)
3. **Look for:**
   ```
   Socket connected: <socket-id>
   Socket.IO connection established
   ```

**Debug if not connecting:**
```javascript
// Check CORS settings in backend/src/index.js
cors: { origin: 'http://localhost:3000' }

// Check CLIENT_URL in backend/.env
CLIENT_URL=http://localhost:3000
```

---

### **Step 5: Test Real-Time Chat**

**Setup: Create Active Booking**
1. Login as **Customer** → Book a service
2. Login as **Provider** (different browser/incognito) → Accept booking
3. Booking status should be **"accepted"** or **"in_progress"**

**Test Chat:**
1. **Customer:** Go to "History" page → Find active booking
2. **Click "Chat with Provider"** button
3. **Type message:** "Hello, when will you arrive?"
4. **Check Provider browser:** Message appears instantly ✅
5. **Provider:** Type reply: "I'm on my way!"
6. **Check Customer browser:** Reply appears instantly ✅

**Test Features:**
- [ ] **Typing Indicator:** Type message → "Provider is typing..." appears on other side
- [ ] **Minimize:** Click minimize button → Unread badge appears
- [ ] **Send while minimized:** Badge count increments
- [ ] **Maximize:** Click chat → Badge resets to 0
- [ ] **Auto-scroll:** New messages scroll into view
- [ ] **Dark mode:** Toggle theme → Chat colors change

---

### **Step 6: Test Call Functionality**

**Prerequisites:**
- Active booking (status: accepted/in_progress)
- Provider has `alternatePhone` set (from Step 3)

**Test Call:**
1. **Customer:** Go to History → Active booking
2. **Click "Call Provider"** button
3. **Expected (Mobile):** Phone dialer opens with provider's number
4. **Expected (Desktop):** Default calling app opens (Skype, FaceTime, etc.)

**Test Edge Cases:**
- [ ] Provider without alternatePhone → Falls back to regular phone
- [ ] Provider without any phone → Alert: "Phone number not available"

---

### **Step 7: Test Chat Cleanup**

1. **Complete a booking** (change status to "completed")
2. **Wait 5 seconds**
3. **Backend console:** Should log chat deletion
4. **Refresh pages:** Chat messages no longer available
5. **Verify:** "Chat" button hidden, only "Rate" button visible

---

## 🐛 Common Issues & Fixes

### **Issue: "Chat with Provider" button not showing**

**Fix:**
```javascript
// Check booking status
console.log(booking.status); // Must be "accepted" or "in_progress"

// Verify canChat function
const canChat = (b) => ['accepted', 'in_progress'].includes(b.status);
```

---

### **Issue: Messages not sending**

**Fix:**
1. Check Socket.IO connection status:
   ```javascript
   // In browser console
   console.log(socket.connected); // Should be true
   ```
2. Check bookingId is correct:
   ```javascript
   console.log(booking._id); // Should match backend room
   ```
3. Check backend logs for socket events

---

### **Issue: Typing indicator stuck**

**Fix:**
- Typing should auto-clear after 2 seconds
- Check if `stop-typing` event is emitted
- Refresh page to reset

---

### **Issue: Call button does nothing**

**Fix (Desktop):**
- `tel:` protocol may not work on desktop
- Install a calling app (Skype, FaceTime)
- Or test on mobile device

---

## ✅ Full Test Checklist

### **Backend Tests**
- [ ] Server starts without errors
- [ ] Socket.IO initialized
- [ ] MongoDB connected
- [ ] No console errors

### **Frontend Tests**
- [ ] No compilation errors
- [ ] Socket.IO connects on login
- [ ] Socket disconnects on logout
- [ ] No React errors in console

### **Profile Tests**
- [ ] /settings page loads
- [ ] Phone updates save
- [ ] Alternate phone updates save
- [ ] (Provider) Languages save as array
- [ ] (Customer) Languages section hidden

### **Chat Tests**
- [ ] Chat button appears for active bookings
- [ ] Chat opens on button click
- [ ] Messages send in real-time
- [ ] Messages appear on both sides
- [ ] Typing indicator works
- [ ] Minimize/maximize works
- [ ] Unread count updates
- [ ] Auto-scroll works
- [ ] Read receipts update
- [ ] Dark mode works
- [ ] Chat closes properly

### **Call Tests**
- [ ] Call button appears
- [ ] Clicking opens dialer (mobile)
- [ ] Clicking opens calling app (desktop)
- [ ] Alert if no phone number
- [ ] Alternate phone prioritized

### **Cleanup Tests**
- [ ] Chat deleted on booking completion
- [ ] 5-second delay works
- [ ] Chat button hidden after completion
- [ ] Rate button appears instead

### **Error Handling Tests**
- [ ] Disconnection error handled
- [ ] Reconnection works (max 5 attempts)
- [ ] Send message while disconnected
- [ ] Invalid booking ID handled

---

## 📊 Success Criteria

✅ **PASS if all these work:**
1. Socket.IO connects on login
2. Messages send/receive in real-time
3. Typing indicator appears
4. Minimize/unread count works
5. Call button triggers tel: protocol
6. Profile updates save correctly
7. Chat deletes after booking completion
8. No errors in console

---

## 🚨 If Something Breaks

### **Step 1: Check Logs**
```bash
# Backend terminal
# Look for errors in:
- MongoDB connection
- Socket.IO initialization
- Socket events

# Frontend browser console
# Look for errors in:
- Socket connection
- React component errors
- API request errors
```

### **Step 2: Check Dependencies**
```bash
# Backend
cd backend
npm list socket.io

# Frontend
cd frontend
npm list socket.io-client
```

### **Step 3: Restart Everything**
```bash
# Kill all processes
Ctrl+C (both terminals)

# Clear cache
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install

# Restart
cd backend && npm start
cd frontend && npm start
```

---

## 🎯 Quick Demo Script

**For presenting the feature:**

1. **Open two browsers** (Chrome + Firefox, or Chrome + Incognito)
2. **Login as Customer** in Browser 1
3. **Login as Provider** in Browser 2
4. **Create booking** from Customer side
5. **Accept booking** from Provider side
6. **Open chat** from Customer → Type "Hi!"
7. **Show typing indicator** on Provider side
8. **Reply from Provider** → "Hello!"
9. **Show minimize feature** → Badge count
10. **Click call button** → Show tel: protocol
11. **Complete booking** → Chat deletes after 5s

**Highlight these features:**
- ✨ Real-time messaging (no refresh needed)
- ✨ Uber/Ola-style UI (professional design)
- ✨ Typing indicators (live feedback)
- ✨ Minimize/unread count (like WhatsApp)
- ✨ Click-to-call (one-tap calling)
- ✨ Multi-language support (12 Indian languages)
- ✨ Privacy-focused (messages auto-delete)

---

**Happy Testing! 🚀**

*If you encounter any issues not covered here, check CHAT_CALL_FEATURE_IMPLEMENTATION.md for detailed troubleshooting.*
