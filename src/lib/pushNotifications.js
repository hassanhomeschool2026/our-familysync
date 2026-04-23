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

const DBG = '[Push debug]';

/**
 * Subscribe the browser to web push and persist the subscription in Supabase.
 * @returns {Promise<PushSubscription | void>}
 */
export async function subscribeToPush(userId, familyId, supabase) {
  console.log(DBG, '1 start subscribeToPush', { userId, familyId, hasWindow: typeof window !== 'undefined' });

  try {
    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPreview = vapid
      ? `${String(vapid).slice(0, 10)}… (len=${String(vapid).length})`
      : 'MISSING / undefined / empty';
    console.log(DBG, '2 VITE_VAPID_PUBLIC_KEY (first 10 chars only + length):', vapidPreview);

    if (!vapid) {
      console.error(
        DBG,
        '3 ABORT: VITE_VAPID_PUBLIC_KEY is missing. Add it to the build environment (e.g. Netlify env), then rebuild.'
      );
      return;
    }

    if (typeof Notification === 'undefined') {
      console.warn(DBG, '4 ABORT: Notification API not available');
      return;
    }

    const permBefore = Notification.permission;
    console.log(DBG, '5 Notification.permission (before any request):', permBefore);

    if (permBefore === 'denied') {
      console.warn(DBG, '6 ABORT: permission already denied; reset in browser site settings');
      return;
    }

    if (permBefore === 'default') {
      console.log(DBG, '7 calling Notification.requestPermission() …');
      const permAfter = await Notification.requestPermission();
      console.log(DBG, '8 Notification.permission (after requestPermission):', permAfter, '(before was:', permBefore + ')');
      if (permAfter !== 'granted') {
        console.warn(DBG, '9 ABORT: user did not grant permission, got:', permAfter);
        return;
      }
    } else {
      console.log(DBG, '7 skip requestPermission: already was', permBefore);
    }

    console.log(DBG, '10 awaiting navigator.serviceWorker.ready …');
    const reg = await navigator.serviceWorker.ready;
    console.log(DBG, '11 navigator.serviceWorker.ready resolved. Registration object:', {
      scope: reg.scope,
      active: reg.active ? { state: reg.active.state, scriptURL: reg.active.scriptURL } : null,
      installing: reg.installing ? reg.installing.state : null,
      waiting: reg.waiting ? reg.waiting.state : null,
      parent: 'ServiceWorkerRegistration',
    });
    console.log(DBG, '11b full registration (inspect in DevTools > expand object):', reg);

    const existing = await reg.pushManager.getSubscription();
    console.log(DBG, '12 existing PushSubscription from pushManager:', existing ? existing.toJSON() : null);

    if (existing) {
      console.log(DBG, '13 branch: had existing browser subscription, upserting to Supabase …', {
        user_id: userId,
        family_id: familyId,
        subscriptionKeys: Object.keys(existing.toJSON() || {}),
      });
      const upsertRes1 = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          family_id: familyId,
          subscription: existing.toJSON(),
        },
        { onConflict: 'user_id' }
      );
      console.log(DBG, '14 existing-sub upsert full Supabase response:', {
        data: upsertRes1.data,
        error: upsertRes1.error,
        status: upsertRes1.status,
        statusText: upsertRes1.statusText,
        // include serialized error for Postgrest
        errorJson: upsertRes1.error ? JSON.stringify(upsertRes1.error) : null,
      });
      if (upsertRes1.error) {
        console.error(DBG, '15 upsert failed (existing sub path):', upsertRes1.error);
        return;
      }
      console.log(DBG, '16 success: existing sub saved');
      return existing;
    }

    console.log(DBG, '13 branch: no existing sub, calling pushManager.subscribe with VAPID key …');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(String(vapid).trim()),
    });
    const subJson = sub.toJSON();
    console.log(DBG, '17 pushManager.subscribe full subscription (toJSON):', subJson);
    console.log(DBG, '17b full PushSubscription object:', sub);

    console.log(DBG, '18 upserting new subscription to Supabase …', {
      user_id: userId,
      family_id: familyId,
    });
    const upsertRes2 = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        family_id: familyId,
        subscription: subJson,
      },
      { onConflict: 'user_id' }
    );
    console.log(DBG, '19 new-sub upsert full Supabase response:', {
      data: upsertRes2.data,
      error: upsertRes2.error,
      status: upsertRes2.status,
      statusText: upsertRes2.statusText,
      count: upsertRes2.count,
      errorJson: upsertRes2.error ? JSON.stringify(upsertRes2.error) : null,
    });

    if (upsertRes2.error) {
      console.error(DBG, '20 upsert failed (new sub path):', upsertRes2.error);
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn(DBG, '21 unsubscribe after failed upsert (ignored):', e);
      }
      return;
    }

    console.log(DBG, '22 success: new sub saved to Supabase');
    return sub;
  } catch (err) {
    console.error(DBG, 'EX catch subscribeToPush:', err, err?.name, err?.message, err?.stack);
  }
}
