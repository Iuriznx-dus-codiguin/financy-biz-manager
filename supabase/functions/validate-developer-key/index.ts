import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { safeHandler, checkEnv } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(safeHandler(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const env = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { key, userEmail } = await req.json();

    if (!key || !userEmail) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Missing key or user email' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Secure server-side key validation
    const validKeys = [
      'DEV_2024_7K9mQ3xW8vN5',
      'FINCY_DEV_3M8kL2pR9wY', 
      'ACCESS_2024_5P7nF4vX9k'
    ];

    const isValid = validKeys.includes(key);

    // Log attempt for security monitoring
    console.log(`Developer key validation attempt: ${userEmail}, key prefix: ${key.substring(0, 3)}, valid: ${isValid}`);

    if (isValid) {
      // Update subscriber status
      const { error: updateError } = await supabase
        .from('subscribers')
        .upsert({
          email: userEmail,
          subscribed: true,
          subscription_tier: 'developer',
          subscription_end: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (updateError) {
        console.error('Error updating subscriber:', updateError);
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ 
      valid: isValid,
      ...(isValid && { message: 'Developer access granted' })
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-developer-key:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));