/** Base64url VAPID public key (VITE_VAPID_PUBLIC_KEY) → Uint8Array for PushManager.subscribe */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId, familyId, supabase) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapid && typeof vapid === 'string' ? urlBase64ToUint8Array(vapid) : vapid,
    });

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        family_id: familyId,
        subscription: sub.toJSON(),
      },
      { onConflict: 'user_id' }
    );

    return sub;
  } catch (err) {
    console.error('Push subscription failed:', err);
  }
}
