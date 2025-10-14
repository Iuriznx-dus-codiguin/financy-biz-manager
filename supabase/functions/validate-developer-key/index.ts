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
      // Chaves originais
      'DEV_2024_7K9mQ3xW8vN5',
      'FINCY_DEV_3M8kL2pR9wY', 
      'ACCESS_2024_5P7nF4vX9k',
      
      // Novas chaves geradas - 2025
      'DEV_2025_9Rx4Tp8Wm2Qs',
      'DEV_2025_5Nj7Vk3Yx6Lm',
      'FINCY_DEV_7Hg9Pz2Qw4Rt',
      'FINCY_DEV_3Kx8Mn5Tb1Yv',
      'ACCESS_2025_6Fq4Wj9Lp3Zn',
      'ACCESS_2025_8Bc2Vh7Rm5Gk',
      'DEV_2025_4Yt6Ns9Mq2Xp',
      'FINCY_DEV_2Dw5Jk8Fg3Ln',
      'ACCESS_2025_9Pv7Hm4Qs6Tz',
      'DEV_2025_3Zr8Kx5Nt2Wj'
    ];

    const isValid = validKeys.includes(key);
    console.log(`🔐 [Key Validation] Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`, {
      userEmail,
      keyPrefix: key.substring(0, 5),
      timestamp: new Date().toISOString()
    });

    if (isValid) {
      console.log('💾 [Database] Updating subscriber status for:', userEmail);
      
      // ✅ CRITICAL: Fetch user_id from profiles table first
      console.log('🔍 [User Lookup] Searching for user with email:', userEmail);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileError) {
        console.error('❌ [Database] Error fetching user profile:', profileError);
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Erro ao buscar usuário no sistema' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!profileData) {
        console.error('❌ [Validation] User not found for email:', userEmail);
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Usuário não encontrado. Faça login primeiro.' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = profileData.id;
      console.log('✅ [User Found] ID:', userId, 'Email:', userEmail);
      
      // ✅ CRITICAL: Include user_id in the upsert to prevent trigger error
      console.log('💾 [Database] Upserting subscriber with user_id:', userId);
      const { data: updateData, error: updateError } = await supabase
        .from('subscribers')
        .upsert({
          user_id: userId,  // ✅ CRITICAL FIX: Add user_id
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
        
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Erro ao atualizar status de assinatura',
          details: updateError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ [Database] Subscriber updated successfully:', updateData);
      console.log('✅ [Trigger] sync_developer_access will be executed automatically');
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