const functions = require("firebase-functions");
const stripe = require("stripe")(functions.config().stripe.secret);
const admin = require("firebase-admin");
admin.initializeApp();

exports.createStripeSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to book.');
  }

  const { serviceId, amount, serviceTitle } = data;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: serviceTitle,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://grassrootsmowing.com/success', // Replace with deep link later
      cancel_url: 'https://grassrootsmowing.com/cancel',
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe error:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create payment session.');
  }
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, functions.config().stripe.webhook_secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Update booking status based on session metadata or DB lookup
    console.log(`Payment confirmed for session ${session.id}`);
    // Typically: update doc in 'bookings' to 'paid' status
  }

  res.json({received: true});
});
