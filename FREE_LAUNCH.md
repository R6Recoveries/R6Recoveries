# R6 Recoveries — Free Launch Plan

## Goal
Run the existing full-stack R6 Recoveries app online without keeping CMD open.

## Current app
- Node/Express backend
- Customer authentication
- Customer dashboard
- Orders and order status
- Admin dashboard
- File uploads
- Payment integration currently present in the project

## Launch architecture
- GitHub: source code
- Cloudflare: domain/DNS and optional Pages frontend
- Node host: runs the Express backend
- Hosted database/storage: production persistence
- PayPal: payment provider (requires adding/configuring PayPal credentials if replacing the current provider)
- Discord: support/community

## Local verification
1. Open CMD in this project folder.
2. Run `npm install`
3. Run `npm run dev`
4. Open http://localhost:3000

## Important
Do not publish secrets from `.env` or put API keys/passwords into GitHub.
