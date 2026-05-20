import dotenv from 'dotenv';
dotenv.config();

console.log("Stripe secret:", process.env.STRIPE_SECRET_KEY);
