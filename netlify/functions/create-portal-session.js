const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { userId } = JSON.parse(event.body || '{}');
    if (!userId) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'userId is required' }) };
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile?.stripe_customer_id) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'No billing account found' }) };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const h = event.headers || {};
    const host = String(h['x-forwarded-host'] || h.Host || h.host || '').split(',')[0].trim();
    const proto = String(h['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const origin = `${proto}://${host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/profile`,
      configuration: 'bpc_1TbCEeCh1f5OVEBZewocvj9s',
    });

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ url: portalSession.url }) };
  } catch (err) {
    console.error('Portal session error:', err);
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
