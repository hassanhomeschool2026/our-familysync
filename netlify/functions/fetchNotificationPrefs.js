/**
 * Batch-load notification_prefs for profile ids via PostgREST.
 * @param {string} supabaseUrl
 * @param {Record<string, string>} headers
 * @param {Iterable<string | null | undefined>} userIds
 * @returns {Promise<Map<string, Record<string, unknown>>>}
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

module.exports = { fetchNotificationPrefsMap };
