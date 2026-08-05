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

| Key | Required | Notes |
|-----|----------|-------|
| `SESSION_SECRET` | Yes | Already set as a Replit secret |
| `RAZORPAY_KEY_ID` | No* | Payments work in mock mode without it |
| `RAZORPAY_KEY_SECRET` | No* | Payments work in mock mode without it |
| `DATABASE_URL` | No | Supabase URL is hardcoded as fallback |

*Add Razorpay keys as Replit Secrets to enable real payment processing.

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
