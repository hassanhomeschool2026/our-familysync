const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { priceId, userId, email } = JSON.parse(event.body);
    console.log('Price ID received:', priceId);
    console.log('Email received:', email);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      success_url: `${event.headers.origin}/upgrade?success=true`,
      cancel_url: `${event.headers.origin}/upgrade?cancelled=true`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
