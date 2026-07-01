# Quick Start Guide

## 🚀 Installation & Setup

### 1. Backend Setup
```bash
cd bookmalawi-backend
npm install
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret_key
PAYPAL_CLIENT_ID=your_paypal_id
PAYCHANG_API_KEY=your_paychang_key
AIRTEL_API_KEY=your_airtel_key
TNM_API_KEY=your_tnm_key
```

Start backend:
```bash
npm run dev
```

### 2. Admin Dashboard
```bash
cd bookmalawi-admin-dashboard
npm install
npm start
```
Visit: http://localhost:3000

### 3. Partner Dashboard
```bash
cd bookmalawi-partner-dashboard
npm install
npm start
```
Visit: http://localhost:3001

### 4. Mobile App
```bash
cd bookmalawi-mobile
npm install
npx expo start
```

## 🔌 API Endpoints

### Authentication
- POST `/api/auth/register/customer` - Register customer
- POST `/api/auth/register/partner` - Register partner
- POST `/api/auth/login` - Login with password
- POST `/api/auth/send-otp` - Send OTP
- POST `/api/auth/login-otp` - Login with OTP

### Admin Routes
- GET `/api/admin/customers` - List customers
- GET `/api/admin/partners` - List partners
- POST `/api/admin/suspend-customer/:userId` - Suspend customer
- POST `/api/admin/delete-customer/:userId` - Delete customer
- GET `/api/admin/logs` - Admin action logs

### Customer Features
- POST `/api/bookings` - Create booking
- GET `/api/bookings` - Get bookings
- POST `/api/reviews` - Submit review
- GET `/api/reviews/:partnerId` - Get partner reviews
- GET `/api/loyalty/points` - Get loyalty points
- POST `/api/loyalty/redeem` - Redeem points
- POST `/api/wishlist` - Add to wishlist
- GET `/api/wishlist` - Get wishlist

### Payment & Transactions
- POST `/api/payments/process` - Process payment
- GET `/api/payments/history` - Payment history

### Partner Features
- GET `/api/partner/bookings` - Get partner bookings
- GET `/api/partner/revenue` - Get revenue stats

### Promotions
- GET `/api/ads/active` - Get active ads
- POST `/api/ads` - Create ad (admin)
- POST `/api/coupons/validate` - Validate coupon
- POST `/api/coupons` - Create coupon (admin)

### Support
- POST `/api/support/tickets` - Create support ticket
- GET `/api/support/tickets` - Get user tickets

## 🗄️ Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE bookmalawi;
```

2. Import schema:
```bash
psql -U postgres -d bookmalawi < DATABASE_SCHEMA.md
```

## 📱 Features Implemented

✅ User authentication (password + OTP + 2FA)
✅ Admin dashboard with user management
✅ Partner dashboard with revenue tracking
✅ Booking system
✅ Payment processing (5 gateways)
✅ Reviews & ratings
✅ Loyalty program
✅ Coupons & promotions
✅ Ads management
✅ Support tickets
✅ Wishlist
✅ Real-time chat (Socket.io)
✅ Mobile app (React Native)

## 🚀 Deployment

### Frontend (Netlify)
```bash
cd bookmalawi-admin-dashboard
npm run build
# Deploy to Netlify
```

### Backend (Render/Railway)
```bash
# Push to GitHub and connect to Render/Railway
```

### Database (Supabase)
```bash
# Import schema to Supabase PostgreSQL
```

## 📞 Support

- Email: support@bookmalawi.com
- Website: www.bookmalawi.com
