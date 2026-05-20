import dotenv from 'dotenv';
dotenv.config();

console.log("Stripe publishable:", process.env.VITE_STRIPE_PUBLISHABLE_KEY);
