import Stripe from 'stripe';
try {
  const s = new Stripe("rpcr-uinl-tvtu-iqng-xwkr");
  console.log("No error on new Stripe()");
  s.checkout.sessions.create({}).catch(e => console.error("Error on API call:", e.message));
} catch(e) {
  console.error("Error on init:", e.message);
}
