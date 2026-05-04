const webpush = require('web-push');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Same stack as send-family-alert / send-checkin-alert: service role + push_subscriptions + notification_prefs.
 * Sends to every subscription for the family (including the person who added the event), same as check-in does for the checker.
 * Skips only when profile.notification_prefs.family_alerts === false (same as family broadcast).
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

exports.handler = async function (event, context) {
  void context;
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
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

  const { family_id, user_name, event_title } = body;

  console.log('[event-alert]', { family_id, user_name, event_title });

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

  const name = user_name != null && String(user_name).trim() !== '' ? String(user_name).trim() : 'Someone';
  const evTitle = event_title != null && String(event_title).trim() !== '' ? String(event_title).trim() : 'a new event';

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
    console.error('[send-event-alert] supabase', res.status, t);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database error' }),
    };
  }

  const subs = await res.json();
  console.log('[send-event-alert] subscriptions:', subs?.length);

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
    title: 'New Event Added to the Calendar!',
    body: `${name} added "${evTitle}".`,
    tag: `event-${Date.now()}`,
    url: '/calendar',
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
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushConfig, payload);
        console.log('[send-event-alert] sent to:', sub.endpoint?.slice(0, 50));
        return { sent: true };
      } catch (err) {
        console.error('[send-event-alert] FAILED for:', sub.endpoint, 'status:', err.statusCode, err.body);
        if (err.statusCode === 410) {
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
            {
              method: 'DELETE',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
              },
            }
          );
        }
        return { sent: false };
      }
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
  console.log('[send-event-alert] done. attempted:', results.length, 'sent:', sent);
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, attempted: results.length }),
  };
};
