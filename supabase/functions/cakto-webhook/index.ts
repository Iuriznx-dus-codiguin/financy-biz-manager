import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkEnv, safeHandler, constantTimeCompare, generateHmacSha256 } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.financy.site',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Mapeamento inteligente de produtos Cakto para planos Financy
interface PlanConfig {
  subscription_type: 'personal' | 'business';
  plan_name: string;
  plan_id: string;
  billing_period: 'monthly' | 'yearly';
  duration_days: number;
  features: {
    max_dashboards: number;
    ai_requests_per_month: number;
    team_members: number;
    whatsapp_integration: boolean;
    advanced_reports?: boolean;
    priority_support?: boolean;
    custom_categories?: boolean;
  };
}

// Mapear identificadores de produto para configurações de plano
const PLAN_MAPPINGS: Record<string, PlanConfig> = {
  // Planos Pessoais Mensais
  'pessoal_basico_mensal': {
    subscription_type: 'personal',
    plan_name: 'Básico Pessoal - Mensal',
    plan_id: 'personal_basic_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: 1,
      ai_requests_per_month: 50,
      team_members: 1,
      whatsapp_integration: true,
    }
  },
  'pessoal_plus_mensal': {
    subscription_type: 'personal',
    plan_name: 'Plus Pessoal - Mensal',
    plan_id: 'personal_plus_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: 3,
      ai_requests_per_month: 150,
      team_members: 1,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
  'pessoal_pro_mensal': {
    subscription_type: 'personal',
    plan_name: 'Pro Pessoal - Mensal',
    plan_id: 'personal_pro_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: -1,
      ai_requests_per_month: -1,
      team_members: 1,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
      custom_categories: true,
    }
  },
  // Planos Pessoais Anuais
  'pessoal_basico_anual': {
    subscription_type: 'personal',
    plan_name: 'Básico Pessoal - Anual',
    plan_id: 'personal_basic_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: 1,
      ai_requests_per_month: 50,
      team_members: 1,
      whatsapp_integration: true,
    }
  },
  'pessoal_plus_anual': {
    subscription_type: 'personal',
    plan_name: 'Plus Pessoal - Anual',
    plan_id: 'personal_plus_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: 3,
      ai_requests_per_month: 150,
      team_members: 1,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
  'pessoal_pro_anual': {
    subscription_type: 'personal',
    plan_name: 'Pro Pessoal - Anual',
    plan_id: 'personal_pro_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: -1,
      ai_requests_per_month: -1,
      team_members: 1,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
      custom_categories: true,
    }
  },
  // Planos Empresariais Mensais
  'empresarial_basico_mensal': {
    subscription_type: 'business',
    plan_name: 'Básico Empresarial - Mensal',
    plan_id: 'business_basic_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: 3,
      ai_requests_per_month: 100,
      team_members: 3,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
  'empresarial_plus_mensal': {
    subscription_type: 'business',
    plan_name: 'Plus Empresarial - Mensal',
    plan_id: 'business_plus_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: 10,
      ai_requests_per_month: 300,
      team_members: 10,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
    }
  },
  'empresarial_pro_mensal': {
    subscription_type: 'business',
    plan_name: 'Pro Empresarial - Mensal',
    plan_id: 'business_pro_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: -1,
      ai_requests_per_month: -1,
      team_members: -1,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
      custom_categories: true,
    }
  },
  'empresarial_familia_mensal': {
    subscription_type: 'business',
    plan_name: 'Família Empresarial - Mensal',
    plan_id: 'business_family_monthly',
    billing_period: 'monthly',
    duration_days: 30,
    features: {
      max_dashboards: 5,
      ai_requests_per_month: 200,
      team_members: 5,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
  // Planos Empresariais Anuais
  'empresarial_basico_anual': {
    subscription_type: 'business',
    plan_name: 'Básico Empresarial - Anual',
    plan_id: 'business_basic_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: 3,
      ai_requests_per_month: 100,
      team_members: 3,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
  'empresarial_plus_anual': {
    subscription_type: 'business',
    plan_name: 'Plus Empresarial - Anual',
    plan_id: 'business_plus_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: 10,
      ai_requests_per_month: 300,
      team_members: 10,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
    }
  },
  'empresarial_pro_anual': {
    subscription_type: 'business',
    plan_name: 'Pro Empresarial - Anual',
    plan_id: 'business_pro_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: -1,
      ai_requests_per_month: -1,
      team_members: -1,
      whatsapp_integration: true,
      advanced_reports: true,
      priority_support: true,
      custom_categories: true,
    }
  },
  'empresarial_familia_anual': {
    subscription_type: 'business',
    plan_name: 'Família Empresarial - Anual',
    plan_id: 'business_family_yearly',
    billing_period: 'yearly',
    duration_days: 365,
    features: {
      max_dashboards: 5,
      ai_requests_per_month: 200,
      team_members: 5,
      whatsapp_integration: true,
      advanced_reports: true,
    }
  },
};

// Função para identificar o plano baseado nos dados do webhook
function identifyPlan(payload: any): PlanConfig | null {
  // Tentar identificar pelo product_name ou metadata
  const productName = payload.product_name?.toLowerCase() || '';
  const metadata = payload.metadata || {};
  const planId = metadata.plan_id?.toLowerCase() || '';
  
  console.log('Tentando identificar plano:', { productName, planId, metadata });
  
  // Primeiro, tentar pelo plan_id nos metadados
  if (planId && PLAN_MAPPINGS[planId]) {
    console.log('Plano identificado por plan_id:', planId);
    return PLAN_MAPPINGS[planId];
  }
  
  // Tentar identificar pelo nome do produto
  for (const [key, config] of Object.entries(PLAN_MAPPINGS)) {
    if (productName.includes(key) || productName.includes(config.plan_id)) {
      console.log('Plano identificado por product_name:', key);
      return config;
    }
  }
  
  // Fallback: tentar extrair informações do nome do produto
  const isAnual = productName.includes('anual') || productName.includes('yearly') || productName.includes('ano');
  const isPessoal = productName.includes('pessoal') || productName.includes('personal');
  const isEmpresarial = productName.includes('empresarial') || productName.includes('business') || productName.includes('empresa');
  
  if (productName.includes('básico') || productName.includes('basico') || productName.includes('basic')) {
    const type = isPessoal ? 'pessoal' : isEmpresarial ? 'empresarial' : 'pessoal';
    const period = isAnual ? 'anual' : 'mensal';
    const key = `${type}_basico_${period}`;
    console.log('Plano identificado por análise de nome (básico):', key);
    return PLAN_MAPPINGS[key];
  }
  
  if (productName.includes('plus')) {
    const type = isPessoal ? 'pessoal' : isEmpresarial ? 'empresarial' : 'pessoal';
    const period = isAnual ? 'anual' : 'mensal';
    const key = `${type}_plus_${period}`;
    console.log('Plano identificado por análise de nome (plus):', key);
    return PLAN_MAPPINGS[key];
  }
  
  if (productName.includes('pro')) {
    const type = isPessoal ? 'pessoal' : isEmpresarial ? 'empresarial' : 'pessoal';
    const period = isAnual ? 'anual' : 'mensal';
    const key = `${type}_pro_${period}`;
    console.log('Plano identificado por análise de nome (pro):', key);
    return PLAN_MAPPINGS[key];
  }
  
  if (productName.includes('família') || productName.includes('familia') || productName.includes('family')) {
    const period = isAnual ? 'anual' : 'mensal';
    const key = `empresarial_familia_${period}`;
    console.log('Plano identificado por análise de nome (família):', key);
    return PLAN_MAPPINGS[key];
  }
  
  console.error('Não foi possível identificar o plano:', { productName, metadata });
  return null;
}

serve(safeHandler(async (req) => {
  console.log('Webhook Cakto recebido:', req.method, req.url);

  // Validar variáveis de ambiente obrigatórias
  const envVars = checkEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CAKTO_WEBHOOK_SECRET']);
  const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'POST') {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    console.log('Payload recebido do Cakto:', JSON.stringify(payload, null, 2));

    // Verificar assinatura do webhook usando HMAC-SHA256
    const signature = req.headers.get('x-webhook-signature');
    if (signature) {
      const expectedSignature = await generateHmacSha256(envVars.CAKTO_WEBHOOK_SECRET, rawBody);
      const providedSignature = signature.replace('sha256=', '');
      
      if (!constantTimeCompare(expectedSignature, providedSignature)) {
        console.error('Assinatura do webhook inválida');
        throw new Error('Unauthorized');
      }
    }

    // Verificar se é um evento de pagamento aprovado
    const eventType = payload.event;
    const paymentData = payload.data || payload;
    const paymentStatus = paymentData.status || payload.status;
    
    if (eventType === 'purchase_approved' || eventType === 'payment.approved' || paymentStatus === 'approved' || paymentStatus === 'paid') {
      // Extrair dados da estrutura do Cakto
      const customer_email = paymentData.customer?.email || payload.customer_email;
      const amount = paymentData.amount || payload.amount;
      const transaction_id = paymentData.id || paymentData.transaction_id || payload.transaction_id;
      const product_name = paymentData.product?.name || paymentData.product_name || payload.product_name;
      const metadata = paymentData.metadata || payload.metadata || {};

      console.log('Processando pagamento aprovado:', {
        email: customer_email,
        valor: amount,
        transacao: transaction_id,
        produto: product_name,
        metadata
      });

      // IDENTIFICAR O PLANO PAGO
      const planConfig = identifyPlan(payload);
      
      if (!planConfig) {
        console.error('❌ ERRO CRÍTICO: Não foi possível identificar o plano do pagamento', {
          product_name,
          metadata,
          transaction_id
        });
        throw new Error('Plano não identificado - pagamento não pode ser processado');
      }

      console.log('✅ Plano identificado com sucesso:', {
        plan_name: planConfig.plan_name,
        plan_id: planConfig.plan_id,
        subscription_type: planConfig.subscription_type,
        billing_period: planConfig.billing_period,
        duration_days: planConfig.duration_days
      });

      // Buscar usuário pelo email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', customer_email)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        throw new Error('Usuário não encontrado');
      }

      // Calcular valor (Cakto pode enviar em centavos ou reais)
      let valorFinal = parseFloat(amount);
      if (valorFinal > 1000) {
        valorFinal = valorFinal / 100; // Converter de centavos para reais
      }

      // Calcular data de expiração baseada no plano
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + planConfig.duration_days);

      console.log('Configurando assinatura:', {
        user_id: profiles.id,
        email: customer_email,
        expires_at: subscriptionEndDate.toISOString(),
        duration_days: planConfig.duration_days
      });

      // Registrar a receita de assinatura
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .insert({
          user_id: profiles.id,
          data: new Date().toISOString().split('T')[0],
          descricao: `Pagamento de assinatura - ${planConfig.plan_name}`,
          categoria: 'Assinatura',
          cliente: customer_email,
          valor: valorFinal,
          forma_pagamento: 'Cartão de Crédito'
        })
        .select('id')
        .single();

      if (receitaError) {
        console.error('Erro ao inserir receita:', receitaError);
        throw new Error('Erro ao registrar receita');
      }

      console.log('Receita registrada com sucesso:', receita);

      // Atualizar ou criar assinatura na tabela user_subscriptions (PRINCIPAL)
      const { error: userSubscriptionError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: profiles.id,
          email: customer_email,
          subscription_type: planConfig.subscription_type,
          plan_name: planConfig.plan_name,
          plan_id: planConfig.plan_id,
          status: 'active',
          billing_period: planConfig.billing_period,
          started_at: new Date().toISOString(),
          expires_at: subscriptionEndDate.toISOString(),
          amount: valorFinal,
          features: planConfig.features,
          payment_method: 'Cartão de Crédito',
          cakto_subscription_id: transaction_id,
          metadata: {
            transaction_id,
            product_name,
            processed_at: new Date().toISOString(),
            webhook_payload: payload
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (userSubscriptionError) {
        console.error('Erro ao atualizar user_subscriptions:', userSubscriptionError);
        throw new Error('Erro ao ativar assinatura');
      }

      console.log('✅ Assinatura ativada com sucesso em user_subscriptions:', {
        user_id: profiles.id,
        plan: planConfig.plan_name,
        expires_at: subscriptionEndDate.toISOString()
      });

      // Atualizar também a tabela subscribers (para compatibilidade)
      const tierMapping: Record<string, string> = {
        'personal_basic_monthly': 'basic',
        'personal_basic_yearly': 'basic',
        'personal_plus_monthly': 'plus',
        'personal_plus_yearly': 'plus',
        'personal_pro_monthly': 'premium',
        'personal_pro_yearly': 'premium',
        'business_basic_monthly': 'basic',
        'business_basic_yearly': 'basic',
        'business_plus_monthly': 'plus',
        'business_plus_yearly': 'plus',
        'business_pro_monthly': 'premium',
        'business_pro_yearly': 'premium',
        'business_family_monthly': 'plus',
        'business_family_yearly': 'plus',
      };

      const { error: subscribersError } = await supabase
        .from('subscribers')
        .upsert({
          user_id: profiles.id,
          email: customer_email,
          subscribed: true,
          subscription_tier: tierMapping[planConfig.plan_id] || 'premium',
          subscription_end: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (subscribersError) {
        console.error('Erro ao atualizar subscribers (não crítico):', subscribersError);
      } else {
      console.log('✅ Tabela subscribers atualizada para compatibilidade');
      }

      // Agendar webhooks de renovação
      try {
        console.log('📅 Agendando webhooks de renovação para:', profiles.id);
        
        const { data: scheduleData, error: scheduleError } = await supabaseClient.functions.invoke('schedule-user-webhooks', {
          body: {
            userId: profiles.id,
            eventType: 'subscription_renewal'
          }
        });
        
        if (scheduleError) {
          console.error('❌ Erro ao agendar webhooks de renovação:', scheduleError);
        } else {
          console.log('✅ Webhooks de renovação agendados:', scheduleData);
        }
      } catch (scheduleError) {
        console.error('❌ Exceção ao agendar webhooks de renovação:', scheduleError);
      }

      // Criar notificação de pagamento para feedback ao usuário
      const { error: notificationError } = await supabase
        .from('payment_notifications')
        .insert({
          user_id: profiles.id,
          plan_name: planConfig.plan_name,
          plan_id: planConfig.plan_id,
          amount: parseFloat(payload.product_value || '0'),
          transaction_id: payload.cakto_id || payload.id,
          processed: false
        });

      if (notificationError) {
        console.error('⚠️ Erro ao criar notificação de pagamento:', notificationError);
        // Não falha o webhook por causa disso - é apenas feedback visual
      } else {
        console.log('✅ Notificação de pagamento criada com sucesso');
      }

      // Responder com sucesso
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Pagamento processado com sucesso',
          plan: {
            name: planConfig.plan_name,
            type: planConfig.subscription_type,
            period: planConfig.billing_period,
            expires_at: subscriptionEndDate.toISOString()
          },
          receita_id: receita?.id || 'criada'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Outros tipos de eventos (opcional - para logs)
    console.log('Evento não processado:', payload.event || payload.status);
    return new Response(
      JSON.stringify({ message: 'Evento recebido mas não processado' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Método não permitido
  throw new Error('Método não permitido');
}));
