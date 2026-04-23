const webpush = require('web-push');
const { fetchNotificationPrefsMap } = require('./fetchNotificationPrefs');

/**
 * Daily digest push (scheduled). Same VAPID + Supabase REST pattern as send-family-alert.js.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

function formatDateInTimeZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function groupTitlesByFamily(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const fid = row.family_id;
    if (fid == null) continue;
    if (!map.has(fid)) map.set(fid, []);
    if (row.title) map.get(fid).push(row.title);
  }
  return map;
}

exports.handler = async (event) => {
  if (event?.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }
  if (
    !process.env.VAPID_SUBJECT ||
    !process.env.VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return { statusCode: 500, body: JSON.stringify({ error: 'VAPID not configured' }) };
  }

  const today = formatDateInTimeZone(new Date(), 'America/Chicago');
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  const eventsUrl = `${supabaseUrl}/rest/v1/events?date=eq.${encodeURIComponent(today)}&select=title,family_id`;
  const tasksUrl = `${supabaseUrl}/rest/v1/tasks?due_date=eq.${encodeURIComponent(today)}&completed=eq.false&select=title,family_id`;
  const subsUrl = `${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth,family_id,user_id`;

  const [eventsRes, tasksRes, subsRes] = await Promise.all([
    fetch(eventsUrl, { headers }),
    fetch(tasksUrl, { headers }),
    fetch(subsUrl, { headers }),
  ]);

  if (!eventsRes.ok) {
    const t = await eventsRes.text();
    console.error('[daily-reminder] events', eventsRes.status, t);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load events' }) };
  }
  if (!tasksRes.ok) {
    const t = await tasksRes.text();
    console.error('[daily-reminder] tasks', tasksRes.status, t);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load tasks' }) };
  }
  if (!subsRes.ok) {
    const t = await subsRes.text();
    console.error('[daily-reminder] push_subscriptions', subsRes.status, t);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load subscriptions' }) };
  }

  const [events, tasks, subscriptions] = await Promise.all([
    eventsRes.json(),
    tasksRes.json(),
    subsRes.json(),
  ]);

  const eventsByFamily = groupTitlesByFamily(events);
  const tasksByFamily = groupTitlesByFamily(tasks);

  const prefsByUserId = await fetchNotificationPrefsMap(
    supabaseUrl,
    headers,
    (subscriptions || []).map((s) => s.user_id)
  );

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const title = "Good morning! Here's your day";

  const results = await Promise.allSettled(
    (subscriptions || []).map(async (sub) => {
      const fid = sub.family_id;
      if (fid == null || !sub?.endpoint || !sub?.p256dh || !sub?.auth) {
        return { outcome: 'skipped' };
      }
      const prefs = prefsByUserId.get(sub.user_id) || {};
      const eventTitlesRaw = eventsByFamily.get(fid) || [];
      const taskTitlesRaw = tasksByFamily.get(fid) || [];
      const eventTitles = prefs.day_before_reminder !== false ? eventTitlesRaw : [];
      const taskTitles = prefs.task_due_reminders !== false ? taskTitlesRaw : [];
      if (eventTitles.length === 0 && taskTitles.length === 0) {
        return { outcome: 'skipped' };
      }

      const parts = [];
      if (eventTitles.length) parts.push(`Events: ${eventTitles.join(', ')}`);
      if (taskTitles.length) parts.push(`Tasks due: ${taskTitles.join(', ')}`);
      const textBody = parts.join(' · ');

      const payload = JSON.stringify({
        title,
        body: textBody,
        tag: 'daily-reminder',
        url: '/feed',
      });

      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      return { outcome: 'sent' };
    })
  );

  let sent = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.outcome === 'sent') {
      sent += 1;
    } else {
      if (r.status === 'rejected') {
        console.error('[daily-reminder] send error:', r.reason?.message || r.reason);
      }
      skipped += 1;
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      today,
      sent,
      skipped,
      subscriptions: (subscriptions || []).length,
    }),
  };
};
