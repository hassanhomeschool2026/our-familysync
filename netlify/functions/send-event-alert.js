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
  if (!res.ok) return map;
  const rows = await res.json();
  for (const row of rows || []) {
    if (!row?.id) continue;
    const prefs = row.notification_prefs && typeof row.notification_prefs === 'object' ? row.notification_prefs : {};
    map.set(row.id, prefs);
  }
  return map;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };

  const bodyStr = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '{}');

  let body;
  try { body = JSON.parse(bodyStr); }
  catch { return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { family_id, user_name, event_title, excludeUserId } = body;

  if (!family_id) return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'family_id is required' }) };

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?family_id=eq.${encodeURIComponent(family_id)}&select=endpoint,p256dh,auth,user_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Database error' }) };

  const subs = await res.json();
  const prefsByUserId = await fetchNotificationPrefsMap(supabaseUrl, { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, (subs || []).map((s) => s.user_id));

  const name = user_name?.trim() || 'Someone';
  const title = event_title?.trim() || 'a new event';

  const payload = JSON.stringify({
    title: `📅 New Event Added`,
    body: `${name} added "${title}"`,
    tag: `event-${Date.now()}`,
    url: '/calendar',
  });

  const results = await Promise.allSettled(
    (subs || []).map(async (sub) => {
      if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) return { sent: false };
      if (sub.user_id === excludeUserId) return { sent: false };
      const prefs = prefsByUserId.get(sub.user_id) || {};
      if (prefs.family_alerts === false) return { sent: false };
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        return { sent: true };
      } catch (err) {
        if (err.statusCode === 410) {
          await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
            method: 'DELETE',
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          });
        }
        return { sent: false };
      }
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled' && r.value?.sent).length;
  return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ sent, attempted: results.length }) };
};
