# Signup Service (scaffold)

This minimal service isolates Sign Up / Sign In / Subscription handling.

Quick start:

1. cd apps/signup-service
2. npm install
3. copy `.env.example` to `.env` and set values
4. npm start

Endpoints:
- `GET /health` - health check
- `POST /signup` - { email, password, legalName }
- `POST /signin` - { email, password }
- `POST /subscribe` - { provider, planId, paymentToken }

Notes:
- This is a scaffold. Integrate the DB, JWT signing with project's `JWT_SECRET`, and PayPal/Twilio flows when ready.
