const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

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

function parseJsonBody(event) {
  const bodyStr = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '{}';
  return JSON.parse(bodyStr);
}

exports.handler = async (event) => {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Server not configured for billing' }),
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Stripe is not configured on the server' }),
    };
  }

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { userId } = parseJsonBody(event);
    if (!userId) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'userId is required' }) };
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return { statusCode: 401, headers: jsonHeaders, body: JSON.stringify({ error: 'Invalid session' }) };
    }
    if (authData.user.id !== userId) {
      return { statusCode: 403, headers: jsonHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile lookup error:', error);
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Could not load billing profile' }) };
    }

    if (!profile?.stripe_customer_id) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          error:
            'No Stripe billing account is linked to this profile. If you upgraded recently, wait a minute and try again.',
        }),
      };
    }

    const origin = getRequestOrigin(event);
    if (!origin) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Could not build portal return URL (missing Origin/Host).' }),
      };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionParams = {
      customer: profile.stripe_customer_id,
      return_url: `${origin}/profile`,
    };
    const portalConfig =
      process.env.STRIPE_PORTAL_CONFIGURATION_ID || 'bpc_1TbCEeCh1f5OVEBZewocvj9s';
    if (portalConfig) {
      sessionParams.configuration = portalConfig;
    }

    const portalSession = await stripe.billingPortal.sessions.create(sessionParams);

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ url: portalSession.url }) };
  } catch (err) {
    console.error('Portal session error:', err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: err.message || 'Portal session failed' }),
    };
  }
};
