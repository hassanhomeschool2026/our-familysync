const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  // Verify the JWT from the request
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Use anon client to verify the JWT and get the user
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const userId = user.id;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    // Delete avatar from storage if exists
    const { data: profile } = await adminClient
      .from('profiles')
      .select('avatar_url, family_id, role')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url) {
      const path = profile.avatar_url.split('/avatars/')[1];
      if (path) await adminClient.storage.from('avatars').remove([path]);
    }

    // If solo admin, delete the family
    if (profile?.role === 'admin' && profile?.family_id) {
      const { data: familyMembers } = await adminClient
        .from('profiles')
        .select('id')
        .eq('family_id', profile.family_id)
        .neq('id', userId);

      if (!familyMembers || familyMembers.length === 0) {
        await adminClient.from('families').delete().eq('id', profile.family_id);
      }
    }

    // Clean up user data
    await adminClient.from('push_subscriptions').delete().eq('user_id', userId);
    await adminClient.from('profiles').delete().eq('id', userId);

    // Delete the Auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('delete-account error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
