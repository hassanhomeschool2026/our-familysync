function getRequestOrigin(event) {
  const h = event.headers || {};
  const direct = h.origin || h.Origin;
  if (direct) return String(direct).replace(/\/$/, '');
  const host = String(h['x-forwarded-host'] || h.Host || h.host || '')
    .split(',')[0]
    .trim();
  if (!host) return null;
  const proto = String(h['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

exports.handler = async (event) => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    console.log('Raw event body:', event.body);
    console.log('isBase64Encoded:', event.isBase64Encoded);

    const bodyStr = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '{}';

    console.log('Parsed body string:', bodyStr);

    const { priceId, userId, email, promoCode } = JSON.parse(bodyStr);

    console.log('Price ID:', priceId);
    console.log('Email:', email);
    console.log('User ID:', userId);
    console.log('Promo code:', promoCode ? '[provided]' : '[none]');

    if (!priceId) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'priceId is required' }),
      };
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set');
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Stripe is not configured on the server' }),
      };
    }

    const origin = getRequestOrigin(event);
    if (!origin) {
      console.error('Could not resolve request origin from headers:', Object.keys(event.headers || {}));
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({
          error: 'Could not build checkout redirect URLs (missing Origin/Host).',
        }),
      };
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: userId != null ? String(userId) : '' },
      allow_promotion_codes: true,
      success_url: `${origin}/upgrade?success=true`,
      cancel_url: `${origin}/upgrade?cancelled=true`,
    };

    const trimmedPromo =
      typeof promoCode === 'string' && promoCode.trim() !== '' ? promoCode.trim() : '';
    if (trimmedPromo) {
      delete sessionParams.allow_promotion_codes;
      sessionParams.discounts = [{ coupon: trimmedPromo }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Session created:', session.id);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Full error:', error.message, error.type || '', error.code || '');
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error.message || 'Checkout failed' }),
    };
  }
};
