const webpush = require('web-push');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function fetchNotificationPrefsMap(supabaseUrl, headers, userIds) {
  const unique = [...new Set([...userIds].filter(Boolean))];
  const map = new Map();
  if (unique.length === 0) return map;

  const inList = unique.join(',');
  const url = `${supabaseUrl}/rest/v1/profiles?id=in.(${inList})&select=id,notification_prefs`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text();
    console.error('[notification_prefs] profiles', res.status, t);
    return map;
  }
  const rows = await res.json();
  for (const row of rows || []) {
    if (!row?.id) continue;
    const prefs =
      row.notification_prefs && typeof row.notification_prefs === 'object'
        ? row.notification_prefs
        : {};
    map.set(row.id, prefs);
  }
  return map;
}

/**
 * Push check-in notice to family (excluding the user who checked in).
 * Body: { family_id, user_id, user_name, location }
 * Env: same as send-family-alert (SUPABASE_*, VAPID_*).
 */
exports.handler = async function (event, context) {
  void context;
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  const bodyStr = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '{}');

  let body;
  try {
    body = JSON.parse(bodyStr);
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const { family_id, user_id: excludeUserId, user_name, location } = body;
  const locationLabel = location != null && String(location).trim() !== '' ? String(location).trim() : 'a location';

  console.log('[checkin-alert]', { family_id, excludeUserId, user_name, location: locationLabel });

  if (!family_id || !excludeUserId) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'family_id and user_id are required' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server not configured' }),
    };
  }
  if (
    !process.env.VAPID_SUBJECT ||
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'VAPID not configured' }),
    };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const name = user_name != null && String(user_name).trim() !== '' ? String(user_name).trim() : 'Someone';
  const filter = `family_id=eq.${encodeURIComponent(family_id)}&user_id=neq.${encodeURIComponent(excludeUserId)}`;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?${filter}&select=endpoint,p256dh,auth,user_id`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );
  if (!res.ok) {
    const t = await res.text();
    console.error('[send-checkin-alert] supabase', res.status, t);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database error' }),
    };
  }
  const subs = await res.json();
  console.log('[checkin-alert] subscriptions:', subs?.length);

  const profileHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  const prefsByUserId = await fetchNotificationPrefsMap(
    supabaseUrl,
    profileHeaders,
    (subs || []).map((s) => s.user_id)
  );

  const payload = JSON.stringify({
    title: `${name} checked in`,
    body: `at ${locationLabel}`,
    tag: 'checkin',
    url: '/checkin',
  });

  const results = await Promise.allSettled(
    (subs || []).map(async (sub) => {
      if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
        return { sent: false };
      }
      const prefs = prefsByUserId.get(sub.user_id) || {};
      if (prefs.checkin_notifications === false) {
        return { sent: false };
      }
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      return { sent: true };
    })
  );
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, attempted: results.length }),
  };
};
