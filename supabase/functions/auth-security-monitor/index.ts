import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { event_type, user_id, ip_address, user_agent, metadata } = await req.json()

    // Enhanced security monitoring based on event types
    let riskLevel = 'low'
    let shouldAlert = false

    // Analyze different event patterns
    switch (event_type) {
      case 'FAILED_LOGIN':
        // Check for brute force attempts
        const { data: recentFailures } = await supabase
          .from('security_audit_logs')
          .select('*')
          .eq('action', 'FAILED_LOGIN')
          .gte('timestamp', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
          .eq('new_values->email', metadata?.email)

        if (recentFailures && recentFailures.length >= 5) {
          riskLevel = 'critical'
          shouldAlert = true
        } else if (recentFailures && recentFailures.length >= 3) {
          riskLevel = 'high'
        }
        break

      case 'UNUSUAL_ACCESS_PATTERN':
        // Check for unusual access times or locations
        riskLevel = 'medium'
        if (metadata?.unusual_time || metadata?.new_location) {
          riskLevel = 'high'
          shouldAlert = true
        }
        break

      case 'SENSITIVE_DATA_ACCESS':
        // Monitor access to sensitive tables
        if (metadata?.table_name === 'equipe_membros' && metadata?.action === 'SELECT') {
          riskLevel = 'medium'
        }
        if (metadata?.bulk_operation) {
          riskLevel = 'high'
          shouldAlert = true
        }
        break

      case 'PERMISSION_ESCALATION':
        riskLevel = 'critical'
        shouldAlert = true
        break
    }

    // Log the security event
    const { error: logError } = await supabase.rpc('log_security_event', {
      p_user_id: user_id,
      p_action: event_type,
      p_table_name: metadata?.table_name || 'auth',
      p_record_id: metadata?.record_id,
      p_old_values: metadata?.old_values,
      p_new_values: metadata?.new_values,
      p_risk_level: riskLevel
    })

    if (logError) {
      console.error('Error logging security event:', logError)
    }

    // Send real-time alerts for high-risk events
    if (shouldAlert) {
      // Create a notification for the user or admin
      const { error: notificationError } = await supabase
        .from('notificacoes')
        .insert({
          user_id: user_id,
          tipo: 'security_alert',
          titulo: `Alerta de Segurança: ${event_type}`,
          mensagem: `Atividade suspeita detectada. Verifique os logs de segurança.`,
          metadata: {
            risk_level: riskLevel,
            ip_address,
            user_agent,
            ...metadata
          }
        })

      if (notificationError) {
        console.error('Error creating security notification:', notificationError)
      }

      // In a production environment, you might also:
      // - Send email alerts
      // - Send webhook to external monitoring system
      // - Temporarily suspend account if multiple critical events
    }

    // Return security assessment
    return new Response(
      JSON.stringify({
        success: true,
        risk_level: riskLevel,
        alert_created: shouldAlert,
        recommendations: getSecurityRecommendations(riskLevel, event_type)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Security monitoring error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function getSecurityRecommendations(riskLevel: string, eventType: string): string[] {
  const recommendations: string[] = []

  switch (riskLevel) {
    case 'critical':
      recommendations.push('Considere suspender temporariamente a conta')
      recommendations.push('Revise imediatamente os logs de acesso')
      recommendations.push('Notifique o usuário sobre atividade suspeita')
      break
      
    case 'high':
      recommendations.push('Monitore closely a atividade do usuário')
      recommendations.push('Considere solicitar re-autenticação')
      break
      
    case 'medium':
      recommendations.push('Registre para análise posterior')
      recommendations.push('Monitore padrões similares')
      break
  }

  if (eventType === 'FAILED_LOGIN') {
    recommendations.push('Considere ativar autenticação de dois fatores')
    recommendations.push('Sugira alteração de senha')
  }

  return recommendations
}