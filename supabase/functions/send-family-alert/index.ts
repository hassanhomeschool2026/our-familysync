import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    (subs || []).map(({ subscription }) =>
      webpush.sendNotification(subscription, JSON.stringify({
        title: title || '🚨 Family Alert',
        body,
        tag: 'family-alert',
        url: url || '/',
      }))
    )
  );

  return new Response(JSON.stringify({ sent: results.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
