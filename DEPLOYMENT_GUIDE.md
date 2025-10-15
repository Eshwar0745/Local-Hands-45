# 🚀 LocalHands Deployment Guide - Render.com

## 📋 Overview

This guide helps you deploy LocalHands to **Render.com** with automatic deployment on every GitHub push.

**What you'll deploy:**
- ✅ Backend (Node.js + Express + Socket.IO)
- ✅ Frontend (React)
- ✅ MongoDB Atlas (Database)
- ✅ Auto-deploy on GitHub push

---

## 🎯 Step 1: Prepare MongoDB Atlas

### **1.1 Create MongoDB Atlas Account**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create new cluster (Free M0 tier)

### **1.2 Create Database User**
1. Database Access → Add New Database User
2. Username: `localhands_user`
3. Password: `<strong_password>` (save this!)
4. User Privileges: **Read and write to any database**

### **1.3 Whitelist IP Addresses**
1. Network Access → Add IP Address
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
3. Confirm

### **1.4 Get Connection String**
1. Database → Connect → Connect your application
2. Copy connection string:
   ```
   mongodb+srv://localhands_user:<password>@cluster0.xxxxx.mongodb.net/localhands?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password
4. Save this for later

---

## 🎯 Step 2: Push Code to GitHub

### **2.1 Create GitHub Repository**
```bash
# If not already done
git init
git add .
git commit -m "Initial commit - LocalHands project"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/LocalHands.git
git branch -M main
git push -u origin main
```

### **2.2 Verify Files**
Make sure these files exist in your repo:
- ✅ `backend/package.json`
- ✅ `backend/src/index.js`
- ✅ `frontend/package.json`
- ✅ `frontend/src/index.js`
- ✅ `render.yaml` (we'll create this)

---

## 🎯 Step 3: Create Render Configuration

The `render.yaml` file tells Render how to deploy your app.

**File created:** `render.yaml` (in root directory)

This configures:
- Backend service (Node.js)
- Frontend static site (React build)
- Environment variables
- Auto-deploy settings

---

## 🎯 Step 4: Deploy to Render

### **4.1 Create Render Account**
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### **4.2 Create New Web Service (Backend)**

1. **Dashboard → New → Web Service**
2. **Connect Repository:** Select `LocalHands`
3. **Settings:**
   ```
   Name: localhands-backend
   Region: Oregon (US West) or closest to you
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```

4. **Environment Variables** (click "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb+srv://localhands_user:<password>@cluster0.xxxxx.mongodb.net/localhands
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
   CLIENT_URL=https://localhands-frontend.onrender.com
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   GOOGLE_CLIENT_ID=your_google_client_id
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```

5. **Click "Create Web Service"**
6. **Wait for deployment** (5-10 minutes)
7. **Copy backend URL:** `https://localhands-backend.onrender.com`

### **4.3 Create Static Site (Frontend)**

1. **Dashboard → New → Static Site**
2. **Connect Repository:** Select `LocalHands`
3. **Settings:**
   ```
   Name: localhands-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

4. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://localhands-backend.onrender.com
   NODE_VERSION=18
   ```

5. **Click "Create Static Site"**
6. **Wait for deployment** (5-10 minutes)
7. **Your app is live!** 🎉

---

## 🎯 Step 5: Configure Auto-Deploy

### **5.1 Enable Auto-Deploy**
1. Go to **Backend Service Settings**
2. Scroll to **Auto-Deploy**
3. Toggle **ON** ✅
4. Repeat for Frontend

Now every time you push to `main` branch:
```bash
git add .
git commit -m "Update feature X"
git push origin main
```
**→ Render automatically rebuilds and deploys!** 🚀

---

## 🎯 Step 6: Update Frontend API URL

### **6.1 Create `.env.production` in frontend folder**

```bash
cd frontend
```

Create file: `frontend/.env.production`
```env
REACT_APP_API_URL=https://localhands-backend.onrender.com
```

### **6.2 Update API configuration**

In `frontend/src/services/api.js`, ensure you're using:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

### **6.3 Push changes**
```bash
git add .
git commit -m "Configure production API URL"
git push origin main
```

Render will auto-deploy! ✅

---

## 🔍 Step 7: Test Your Deployment

### **7.1 Test Backend**
```bash
curl https://localhands-backend.onrender.com/api/health
```
Expected: `{"status": "ok"}`

### **7.2 Test Frontend**
Open browser: `https://localhands-frontend.onrender.com`

### **7.3 Test Full Flow**
1. Register new user
2. Request OTP
3. Login
4. Create booking
5. Test chat (Socket.IO)

---

## 🐛 Troubleshooting

### **Issue: Backend not starting**
**Solution:**
1. Check Render logs: Service → Logs tab
2. Verify environment variables are set
3. Check MongoDB Atlas connection string
4. Ensure IP whitelist includes 0.0.0.0/0

### **Issue: Frontend can't connect to backend**
**Solution:**
1. Verify `REACT_APP_API_URL` in frontend env vars
2. Check CORS settings in backend:
   ```javascript
   cors: {
     origin: ['https://localhands-frontend.onrender.com'],
     credentials: true
   }
   ```

### **Issue: Socket.IO not working**
**Solution:**
1. Update Socket.IO CORS in `backend/src/index.js`:
   ```javascript
   const io = new Server(server, {
     cors: {
       origin: process.env.CLIENT_URL || 'http://localhost:3000',
       methods: ['GET', 'POST']
     }
   });
   ```

### **Issue: "Cold start" delay on free tier**
**Fix:** Free tier spins down after 15 min inactivity
- First request takes 30-60 seconds
- Upgrade to paid tier ($7/mo) for always-on

---

## 💡 Alternative: Deploy with Vercel

### **Vercel for Frontend Only**

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Project name: localhands
# - Framework: Create React App
# - Build command: npm run build
# - Output directory: build

# Set environment variable
vercel env add REACT_APP_API_URL production
# Enter: https://localhands-backend.onrender.com

# Deploy to production
vercel --prod
```

**Backend stays on Render, Frontend on Vercel**

---

## 📊 Deployment Checklist

Before deploying to production:

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with read/write permissions
- [ ] IP whitelist set to 0.0.0.0/0
- [ ] Connection string copied
- [ ] GitHub repository created and pushed
- [ ] Render account created
- [ ] Backend service deployed
- [ ] Frontend static site deployed
- [ ] Environment variables configured
- [ ] Auto-deploy enabled
- [ ] CORS configured for production URLs
- [ ] Socket.IO CORS configured
- [ ] API URL updated in frontend
- [ ] Test registration flow
- [ ] Test booking flow
- [ ] Test chat functionality
- [ ] Test on mobile devices
- [ ] SSL certificate active (automatic with Render)

---

## 🎉 Success!

Your LocalHands app is now:
- ✅ Live on the internet
- ✅ Auto-deploys on every GitHub push
- ✅ Has free SSL certificate
- ✅ Monitored with logs
- ✅ Scalable (upgrade when needed)

**URLs:**
- Frontend: `https://localhands-frontend.onrender.com`
- Backend: `https://localhands-backend.onrender.com`

**Next steps:**
1. Get custom domain (optional)
2. Set up monitoring (Render provides basic metrics)
3. Configure production Twilio account
4. Add Google Analytics
5. Set up error tracking (Sentry)

---

## 🔐 Security Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Never commit `.env` files to GitHub
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB Atlas IP whitelist (or use VPC)
- [ ] Rotate API keys regularly
- [ ] Set up rate limiting in production
- [ ] Enable HTTPS only (Render does this automatically)
- [ ] Configure Content Security Policy headers

---

**Happy Deploying! 🚀**

Any issues? Check Render logs or MongoDB Atlas metrics for debugging.
