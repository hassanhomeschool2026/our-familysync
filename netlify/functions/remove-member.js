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

  const token = (event.headers?.authorization || '').replace('Bearer ', '').trim();
  if (!token) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };

  const body = JSON.parse(event.body || '{}');
  const { member_id } = body;
  if (!member_id) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'member_id required' }) };

  const adminClient = createClient(supabaseUrl, serviceKey);

  // Verify the requester is an admin in the same family
  const { data: requester } = await adminClient
    .from('profiles')
    .select('role, family_id')
    .eq('id', user.id)
    .single();

  if (!requester || requester.role !== 'admin') {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Not an admin' }) };
  }

  // Verify target is in the same family
  const { data: target } = await adminClient
    .from('profiles')
    .select('family_id')
    .eq('id', member_id)
    .single();

  if (!target || target.family_id !== requester.family_id) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Member not in your family' }) };
  }

  // Remove the member
  const { error } = await adminClient
    .from('profiles')
    .update({ family_id: null, role: 'member' })
    .eq('id', member_id);

  if (error) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: error.message }) };

  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
};
