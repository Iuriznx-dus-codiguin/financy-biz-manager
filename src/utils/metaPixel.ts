// Meta Pixel tracking utilities
// Declaração de tipo para o objeto fbq do Meta Pixel
declare global {
  interface Window {
    fbq?: (
      action: string,
      event: string,
      params?: Record<string, any>
    ) => void;
  }
}

/**
 * Rastreia visualização de conteúdo (ViewContent)
 * NÃO USAR NA PLATAFORMA - Este evento é exclusivo da landing page
 */
export const trackViewContent = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'ViewContent');
  }
};

/**
 * Rastreia conclusão de cadastro (CompleteRegistration)
 * Disparar após criação bem-sucedida da conta via Supabase
 */
export const trackCompleteRegistration = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'CompleteRegistration');
    console.log('📊 Meta Pixel: CompleteRegistration tracked');
  }
};

/**
 * Rastreia lead qualificado (Lead)
 * Disparar após conclusão completa do onboarding
 */
export const trackLead = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead');
    console.log('📊 Meta Pixel: Lead tracked');
  }
};

/**
 * Rastreia início de trial gratuito (StartTrial)
 * Disparar quando usuário inicia o período de teste gratuito
 */
export const trackStartTrial = (params?: { value?: number; currency?: string; predicted_ltv?: number }) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'StartTrial', params);
    console.log('📊 Meta Pixel: StartTrial tracked', params);
  }
};

/**
 * Rastreia assinatura/renovação (Subscribe)
 * Disparar quando usuário assina ou renova um plano
 */
export const trackSubscribe = (params?: { value?: number; currency?: string; predicted_ltv?: number }) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Subscribe', params);
    console.log('📊 Meta Pixel: Subscribe tracked', params);
  }
};

/**
 * Rastreia compra/pagamento confirmado (Purchase)
 * Disparar após confirmação de pagamento bem-sucedido
 */
export const trackPurchase = (params: { value: number; currency: string; content_name?: string; content_type?: string }) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', params);
    console.log('📊 Meta Pixel: Purchase tracked', params);
  }
};
