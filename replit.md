# Rituals Makhana — E-Commerce Website

A premium health snack e-commerce site for Rituals Makhana products, featuring a wellness tracker, user authentication, and integrated payments.

## Stack

- **Backend:** Node.js + Express (`server.js`)
- **Database:** PostgreSQL via Supabase (connection string hardcoded as fallback in `server.js`)
- **Payments:** Razorpay (falls back to mock orders if keys are absent)
- **Frontend:** Static HTML pages served by Express

## How to Run

The app starts automatically via the **Start application** workflow.

```
npm run dev
```

Server listens on port **5000**.

## Environment Variables / Secrets

| Key | Required | Status | Notes |
|-----|----------|--------|-------|
| `SESSION_SECRET` | Yes | ✅ Set | Express session signing key |
| `SUPABASE_DATABASE_URL` | Yes | ✅ Set | PostgreSQL connection string for user accounts, wellness logs, and orders |
| `RAZORPAY_KEY_ID` | No* | ✅ Set | Razorpay public key for payment processing |
| `RAZORPAY_KEY_SECRET` | No* | ✅ Set | Razorpay secret key for order verification |

*Payments fall back to mock mode if Razorpay keys are absent.

## Project Structure

```
server.js          # Express backend — API routes, DB init, session handling
index.html         # Homepage
products/          # Product listing and detail pages
admin/             # Admin dashboard
wellness/          # Wellness score tracker
profile/           # User profile
auth-modal.js      # Authentication modal (sign in / sign up)
attached_assets/   # Product images and other media
```

## User Preferences

- Keep existing project structure and stack — do not restructure or migrate.
