import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { safeHandler, checkEnv } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(safeHandler(async (req) => {
  console.log('🔑 [Developer Key Validation] Function invoked', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ [CORS] Preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ [Error] Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('🔍 [Env Check] Validating environment variables...');
    const env = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    console.log('✅ [Env Check] Environment variables validated');
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ [Supabase] Client created successfully');

    console.log('📥 [Request] Parsing request body...');
    const body = await req.json();
    const { key, userEmail } = body;
    
    console.log('📋 [Request Data]', {
      hasKey: !!key,
      keyLength: key?.length,
      keyPrefix: key?.substring(0, 5),
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    });

    if (!key || !userEmail) {
      console.log('❌ [Validation] Missing required fields', { hasKey: !!key, hasEmail: !!userEmail });
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
    console.log(`🔐 [Key Validation] Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`, {
      userEmail,
      keyPrefix: key.substring(0, 5),
      timestamp: new Date().toISOString()
    });

    if (isValid) {
      console.log('💾 [Database] Updating subscriber status for:', userEmail);
      
      // First check if subscriber exists
      const { data: existingSubscriber, error: selectError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ [Database] Error checking existing subscriber:', selectError);
      } else {
        console.log('📊 [Database] Existing subscriber data:', existingSubscriber);
      }

      // Update subscriber status
      const { data: updateData, error: updateError } = await supabase
        .from('subscribers')
        .upsert({
          email: userEmail,
          subscribed: true,
          subscription_tier: 'developer',
          subscription_end: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        })
        .select();

      if (updateError) {
        console.error('❌ [Database] Error updating subscriber:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log('✅ [Database] Subscriber updated successfully:', updateData);
    }

    const response = { 
      valid: isValid,
      ...(isValid && { message: 'Developer access granted' })
    };

    console.log('📤 [Response] Sending response:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 [Fatal Error] Unhandled exception:', {
      error: error,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));