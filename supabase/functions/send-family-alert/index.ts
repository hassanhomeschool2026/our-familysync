import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Shape expected by npm:web-push `sendNotification` (browser subscription JSON / PushSubscription#toJSON). */
type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Coerce a JSON/JSONB row (from `subscription` column) to web-push's expected format.
 * Handles full `PushSubscription#toJSON()` objects: { endpoint, keys: { p256dh, auth } }.
 */
function parsePushSubscription(raw: unknown): WebPushSubscription | null {
  if (raw == null) return null;
  const s = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (typeof s !== 'object' || s === null) return null;
  const obj = s as Record<string, unknown>;
  const endpoint = obj.endpoint;
  if (typeof endpoint !== 'string' || !endpoint) return null;
  const keyBag = obj.keys;
  if (typeof keyBag !== 'object' || keyBag === null) return null;
  const k = keyBag as Record<string, unknown>;
  const p256dh = k.p256dh;
  const auth = k.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null;
  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { family_id, title, body, url } = await req.json();

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('family_id', family_id);

  const results = await Promise.allSettled(
    (subs || []).map(({ subscription }) => {
      const parsed = parsePushSubscription(subscription);
      if (!parsed) {
        console.warn('[send-family-alert] skip row: could not parse subscription (need endpoint, keys.p256dh, keys.auth). Raw type:', typeof subscription);
        return Promise.resolve();
      }
      // Exact shape web-push uses internally (same as PushSubscription#toJSON)
      const pushSub: WebPushSubscription = {
        endpoint: parsed.endpoint,
        keys: {
          p256dh: parsed.keys.p256dh,
          auth: parsed.keys.auth,
        },
      };
      const p = pushSub.keys.p256dh;
      const a = pushSub.keys.auth;
      console.log('[send-family-alert] parsed subscription (shape matches web-push; key strings truncated in log):', {
        endpoint: pushSub.endpoint,
        keys: {
          p256dh: `${p.slice(0, 8)}…(${p.length} chars)`,
          auth: `${a.slice(0, 4)}…(${a.length} chars)`,
        },
      });
      return webpush.sendNotification(
        pushSub,
        JSON.stringify({
          title: title || '🚨 Family Alert',
          body,
          tag: 'family-alert',
          url: url || '/',
        })
      );
    })
  );

  return new Response(JSON.stringify({ sent: results.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}, { verify_jwt: false });
