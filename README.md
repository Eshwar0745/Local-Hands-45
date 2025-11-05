# LocalHands - Service Booking & Payment Platform

A full-stack web application where customers can book local services, providers can manage bookings and generate bills, and payments can be made securely via Razorpay or cash.

---

## 🚀 Features

- **User Authentication**: JWT-based auth for customers, providers, and admins
- **Service Booking**: Browse services, request bookings, track status
- **Bill Generation**: Providers generate itemized bills after completing jobs
- **Dual Payment Options**: 
  - Online payments via Razorpay (test & live modes)
  - Cash payments with transaction logging
- **Transaction Ledger**: Immutable payment records for both methods
- **Provider Earnings**: Automatic calculation of platform fees and withdrawable balances
- **Real-time Updates**: Booking status and payment notifications
- **QR Code Support**: Quick booking tracking
- **Google Maps Integration**: Location-based service selection

---

## 🛠️ Tech Stack

### Frontend
- **React.js** (v18.2.0) - UI framework
- **React Router** - Client-side routing
- **Axios** - API requests
- **Material-UI** - Component library
- **Tailwind CSS** - Styling
- **Razorpay Checkout** - Payment gateway integration
- **Leaflet** - Maps
- **Framer Motion** - Animations

### Backend
- **Node.js** + **Express.js** - REST API
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **Razorpay Node SDK** - Payment processing
- **bcrypt** - Password hashing

---

## 📁 Project Structure

```
Local-Hands-01/
├── frontend/                 # React application
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── App.js           # Main app component
│   ├── .env                 # Environment variables
│   └── package.json
│
├── backend/                  # Express API
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth & validation
│   │   └── app.js           # Express app setup
│   ├── .env                 # Environment variables
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18.x or higher)
- **MongoDB** (local or Atlas)
- **Razorpay Account** (for payment integration)
- **Google OAuth Credentials** (optional, for social login)

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Local-Hands-01
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/localhands
JWT_SECRET=your_jwt_secret_key_here

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

CORS_ORIGIN=http://localhost:3000
```

Start the backend server:

```bash
npm start
```

Backend will run at: **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_BASE=http://localhost:5000/api
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the frontend:

```bash
npm start
```

Frontend will run at: **http://localhost:3000**

---

## 🔑 Environment Variables

### Backend (`.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/localhands` |
| `JWT_SECRET` | Secret for JWT signing | `mysecretkey123` |
| `RAZORPAY_KEY_ID` | Razorpay public key | `rzp_test_xxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | `xxxxxxxxxx` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Frontend (`.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `REACT_APP_RAZORPAY_KEY_ID` | Razorpay public key (optional) | `rzp_test_xxxxx` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxxxx.apps.googleusercontent.com` |

---


