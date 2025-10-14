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
