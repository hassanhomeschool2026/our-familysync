exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('Raw event body:', event.body);
    console.log('isBase64Encoded:', event.isBase64Encoded);

    const bodyStr = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    console.log('Parsed body string:', bodyStr);

    const { priceId, userId, email, promoCode } = JSON.parse(bodyStr);

    console.log('Price ID:', priceId);
    console.log('Email:', email);
    console.log('User ID:', userId);
    console.log('Promo code:', promoCode ? '[provided]' : '[none]');

    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'priceId is required' }),
      };
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      success_url: `${event.headers.origin}/upgrade?success=true`,
      cancel_url: `${event.headers.origin}/upgrade?cancelled=true`,
    };

    const trimmedPromo =
      typeof promoCode === 'string' && promoCode.trim() !== '' ? promoCode.trim() : '';
    if (trimmedPromo) {
      sessionParams.discounts = [{ coupon: trimmedPromo }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Session created:', session.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Full error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
