# R6 Recoveries — Full-Stack App

A real Node.js + Express + SQLite (using Node's built-in SQLite support) web app for R6 Recoveries.

## Included
- Customer registration/login
- Customer profile + animated stats
- Order creation and status tracking
- Customer recovery dashboard
- Admin dashboard
- Admin order status + internal notes
- Secure password hashing
- JWT authentication
- Recovery file upload endpoint
- Stripe Checkout integration when Stripe keys are configured
- Demo payment mode when Stripe is not configured
- Responsive neon "Neon Overdrive" UI

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Change `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Install dependencies:

   npm install

5. Start:

   npm run dev

6. Open:

   http://localhost:3000

The database is created automatically as `r6-recoveries.db`.

## Stripe

To use live/test Stripe Checkout:
- Put your Stripe secret key in `STRIPE_SECRET_KEY`.
- Set `PUBLIC_URL` to your public HTTPS URL.
- Configure a webhook to `POST /api/payments/webhook`.
- Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

The checkout endpoint creates a Stripe Checkout Session and redirects the customer to Stripe. The webhook marks the order as paid.

Without Stripe credentials, the app uses a clearly labeled demo payment flow so the site can still be tested end-to-end.

## Admin

The first admin account is created from:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Do not use the example password in production.

## Production checklist

- Use HTTPS.
- Use a strong random JWT secret.
- Put the database and uploads on persistent storage.
- Use a production session/auth strategy or short-lived JWT + refresh tokens.
- Put uploads behind authentication and object storage.
- Configure Stripe webhooks.
- Add rate limiting and email verification before public launch.
- Replace placeholder testimonials and business copy with real information.


### Windows note
This version uses Node's built-in `node:sqlite`, so the install does not require Python, Visual Studio Build Tools, or `node-gyp` for SQLite.


## Version 3.0.0 visual upgrade
The frontend has been rebuilt with a black/red/cyan tactical operations visual system, responsive command-center layouts, animated radar/HUD elements, premium service cards, a richer customer portal preview, and upgraded authentication/dashboard styling. The existing API, accounts, orders, payments, file uploads, and admin controls are preserved.
