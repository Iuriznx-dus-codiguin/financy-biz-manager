import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { safeHandler, checkEnv, constantTimeCompare } from '../_shared/utils.ts';

const allowedOrigins = [
  'https://app.financy.site',
  'https://financy.site',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

function getCorsHeaders(origin: string) {
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function getValidKeys(): string[] {
  const raw = Deno.env.get('DEVELOPER_VALID_KEYS') || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function compareAgainstAny(provided: string, candidates: string[]): boolean {
  let matched = false;
  for (const c of candidates) {
    // constantTimeCompare returns true on equality; use bitwise OR via flag to keep
    // checking all candidates (avoid early return timing leak)
    if (constantTimeCompare(provided, c)) matched = true;
  }
  return matched;
}

serve(safeHandler(async (req) => {
  const origin = req.headers.get('Origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const env = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']);

  // Require authenticated caller
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ valid: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice('Bearer '.length);
  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ valid: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const callerEmail = (claimsData.claims.email as string | undefined) || '';
  const callerUserId = claimsData.claims.sub as string;

  const body = await req.json().catch(() => ({}));
  const { key } = body || {};

  if (!key || typeof key !== 'string') {
    return new Response(JSON.stringify({ valid: false, error: 'Missing key' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const validKeys = getValidKeys();
  if (validKeys.length === 0) {
    console.error('DEVELOPER_VALID_KEYS not configured');
    return new Response(JSON.stringify({ valid: false, error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isValid = compareAgainstAny(key.trim(), validKeys);
  if (!isValid) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Grant developer tier ONLY to the authenticated caller
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error: updateError } = await supabase
    .from('subscribers')
    .upsert({
      user_id: callerUserId,
      email: callerEmail,
      subscribed: true,
      subscription_tier: 'developer',
      subscription_end: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

  if (updateError) {
    console.error('Error updating subscriber:', updateError);
    return new Response(JSON.stringify({ valid: false, error: 'Database error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ valid: true, message: 'Developer access granted' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));

