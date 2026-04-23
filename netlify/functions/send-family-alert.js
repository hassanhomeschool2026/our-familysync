const webpush = require('web-push');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Batch-load notification_prefs for profile ids via PostgREST (inlined so the bundler always exposes exports.handler).
 */
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
 * Same pattern as BillSync send-reminders: web-push + Supabase REST (service role).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
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

  const { family_id, title, body: textBody, url: urlField } = body;
  console.log('[Alert] Received:', { family_id, title, body: textBody });
  if (!family_id) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'family_id is required' }),
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

  const filter = `family_id=eq.${encodeURIComponent(family_id)}`;
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
    console.error('[send-family-alert] supabase', res.status, t);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database error' }),
    };
  }
  const subs = await res.json();
  console.log('[Alert] Subscriptions found:', subs?.length, JSON.stringify(subs));

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
    title: title || '🚨 Family Alert',
    body: textBody,
    tag: 'family-alert',
    url: urlField != null && urlField !== '' ? urlField : '/feed',
  });

  const results = await Promise.allSettled(
    (subs || []).map(async (sub) => {
      if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) {
        return { sent: false };
      }
      const prefs = prefsByUserId.get(sub.user_id) || {};
      if (prefs.family_alerts === false) {
        return { sent: false };
      }
      console.log('[Alert] Sending to endpoint:', sub.endpoint?.slice(0, 50));
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      console.log('[Alert] Sent successfully');
      return { sent: true };
    })
  );
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
  console.log('[Alert] Done. Attempted:', results.length, 'sent:', sent);
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, attempted: results.length }),
  };
};
