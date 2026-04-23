/** Base64url VAPID public key (VITE_VAPID_PUBLIC_KEY) → Uint8Array for PushManager.subscribe */
function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== 'string') {
    throw new Error('VAPID public key must be a non-empty string');
  }
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * BillSync-style: persist endpoint / p256dh / auth as separate columns via PostgREST (no supabase client upsert).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
async function restUpsertPushSubscription(supabase, { userId, familyId, endpoint, p256dh, auth }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn('[push] no session, skip saving subscription');
    return false;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    console.error('[push] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing');
    return false;
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=user_id,endpoint`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        family_id: familyId,
        endpoint,
        p256dh,
        auth,
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    console.error('[push] save failed', res.status, t);
    return false;
  }
  return true;
}

/**
 * Subscribe the browser to web push and persist the subscription in Supabase (REST + separate columns).
 * @returns {Promise<PushSubscription | void>}
 */
export async function subscribeToPush(userId, familyId, supabase) {
  try {
    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapid) {
      console.error(
        '[push] VITE_VAPID_PUBLIC_KEY is missing. Add it to the build environment, then rebuild.'
      );
      return;
    }
    if (typeof Notification === 'undefined') {
      return;
    }
    if (Notification.permission === 'denied') {
      return;
    }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const j = existing.toJSON();
      const p256dh = j.keys?.p256dh;
      const auth = j.keys?.auth;
      if (!j.endpoint || !p256dh || !auth) return;
      const ok = await restUpsertPushSubscription(supabase, {
        userId,
        familyId,
        endpoint: j.endpoint,
        p256dh,
        auth,
      });
      return ok ? existing : undefined;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(String(vapid).trim()),
    });
    const j = sub.toJSON();
    const p256dh = j.keys?.p256dh;
    const auth = j.keys?.auth;
    if (!j.endpoint || !p256dh || !auth) {
      try {
        await sub.unsubscribe();
      } catch { /* */
      }
      return;
    }
    const ok = await restUpsertPushSubscription(supabase, {
      userId,
      familyId,
      endpoint: j.endpoint,
      p256dh,
      auth,
    });
    if (!ok) {
      try {
        await sub.unsubscribe();
      } catch { /* */
      }
      return;
    }
    return sub;
  } catch (err) {
    console.error('[push] subscribeToPush', err);
  }
}
