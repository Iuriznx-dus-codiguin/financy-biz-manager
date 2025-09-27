import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id?: string;
  email?: string;
  telefone?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body: RequestBody = await req.json();
    let userId = body.user_id;

    // If no user_id provided, try to find user by email or phone
    if (!userId && (body.email || body.telefone)) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .or(`email.eq.${body.email},telefone.eq.${body.telefone}`)
        .single();

      if (profileError) {
        console.error('Error finding user:', profileError);
        return new Response(
          JSON.stringify({ 
            error: 'User not found',
            message: 'Could not find user with provided email or phone'
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      userId = profile.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing user identifier',
          message: 'Please provide user_id, email, or telefone'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the user's main dashboard using our database function
    const { data: result, error: dashboardError } = await supabase
      .rpc('get_user_main_dashboard', { p_user_id: userId });

    if (dashboardError) {
      console.error('Error getting main dashboard:', dashboardError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          message: 'Could not retrieve main dashboard'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Also migrate any orphan transactions for this user
    const { error: migrateError } = await supabase
      .rpc('migrate_orphan_transactions_to_main_dashboard', { p_user_id: userId });

    if (migrateError) {
      console.warn('Error migrating orphan transactions:', migrateError);
      // Don't fail the request, just log the warning
    }

    // Get dashboard details
    const { data: dashboardDetails, error: detailsError } = await supabase
      .from('user_dashboards')
      .select('id, name, type, is_default, created_at')
      .eq('id', result)
      .single();

    if (detailsError) {
      console.error('Error getting dashboard details:', detailsError);
    }

    // Log the operation for monitoring
    console.log(`Main dashboard retrieved for user ${userId}: ${result}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        main_dashboard_id: result,
        dashboard_details: dashboardDetails || null,
        message: 'Main dashboard retrieved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});