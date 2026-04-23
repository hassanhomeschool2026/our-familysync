import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

serve(async () => {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date().toISOString().split('T')[0];

  // Get today's events
  const { data: events } = await supabase
    .from('events')
    .select('title, family_id')
    .eq('date', today);

  // Get today's due tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, family_id')
    .eq('due_date', today)
    .eq('completed', false);

  // Get all subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription, family_id');

  for (const sub of subs || []) {
    const familyEvents = (events || []).filter(e => e.family_id === sub.family_id);
    const familyTasks = (tasks || []).filter(t => t.family_id === sub.family_id);

    if (familyEvents.length === 0 && familyTasks.length === 0) continue;

    const lines = [];
    if (familyEvents.length) lines.push(`📅 Today: ${familyEvents.map(e => e.title).join(', ')}`);
    if (familyTasks.length) lines.push(`✅ Due: ${familyTasks.map(t => t.title).join(', ')}`);

    await webpush.sendNotification(sub.subscription, JSON.stringify({
      title: 'Good morning! 🌅',
      body: lines.join(' · '),
      tag: 'daily-digest',
      url: '/',
    })).catch(() => {});
  }

  return new Response('ok');
});
