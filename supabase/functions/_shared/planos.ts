// Catálogo único de planos da Financy. Fonte de verdade para:
//  - o webhook da Cakto (identificação do plano, duração e limites gravados em user_subscriptions.features);
//  - o front (tela de planos, nome comercial, recursos e limites por plan_id).
// Regras puras, sem dependências. Preços, textos e limites são os que já estavam em produção
// (Assinatura.tsx e cakto-webhook); mudar qualquer um deles é decisão comercial.

export type TipoPlano = 'personal' | 'business';
export type PeriodoPlano = 'monthly' | 'yearly';
export type NivelPlano = 'plus' | 'pro' | 'enterprise';

/** Recursos que a aplicação realmente libera ou bloqueia por plano. */
export type Recurso = 'inteligencia_basica' | 'inteligencia_avancada' | 'dashboard_avancado';

/** Limites gravados em user_subscriptions.features (-1 = ilimitado). */
export interface LimitesPlano {
  max_dashboards: number;
  ai_requests_per_month: number;
  team_members: number;
  whatsapp_integration: boolean;
  advanced_analytics?: boolean;
  advanced_reports?: boolean;
  priority_support?: boolean;
  custom_categories?: boolean;
  export_data?: boolean;
}

export interface Plano {
  /** plan_id gravado em user_subscriptions (ex.: personal_plus_monthly). */
  id: string;
  /** Chave histórica usada nos metadados da Cakto (ex.: pessoal_plus_mensal). */
  chaveCakto: string;
  /** Família sem período (ex.: personal_plus), usada pela tela de planos. */
  familia: string;
  /** Nome comercial curto exibido ao usuário (ex.: "Plus Pessoal"). */
  nome: string;
  /** plan_name gravado em user_subscriptions (ex.: "Plus Pessoal - Mensal"). */
  nomeCompleto: string;
  tipo: TipoPlano;
  nivel: NivelPlano;
  periodo: PeriodoPlano;
  duracaoDias: number;
  /** Preço em reais cobrado no período. */
  preco: number;
  checkoutUrl: string;
  /** Identificadores da oferta na Cakto (trecho final da URL de checkout). */
  ofertasCakto: string[];
  limites: LimitesPlano;
  recursos: Recurso[];
}

export interface FamiliaPlano {
  id: string;
  tipo: TipoPlano;
  /** Nome exibido no card da tela de planos. */
  titulo: string;
  descricao: string;
  selo?: string;
  destaque?: 'recomendado' | 'popular';
  itens: { nome: string; valor: string }[];
}

const RECURSOS_PLUS_PESSOAL: Recurso[] = ['inteligencia_basica'];
const RECURSOS_COMPLETOS: Recurso[] = ['inteligencia_basica', 'inteligencia_avancada', 'dashboard_avancado'];

function oferta(url: string): string[] {
  const trecho = url.split('/').pop() ?? '';
  const [curto] = trecho.split('_');
  return Array.from(new Set([trecho, curto].filter(Boolean)));
}

function plano(p: Omit<Plano, 'ofertasCakto'>): Plano {
  return { ...p, ofertasCakto: oferta(p.checkoutUrl) };
}

export const PLANOS: readonly Plano[] = [
  plano({
    id: 'personal_plus_monthly', chaveCakto: 'pessoal_plus_mensal', familia: 'personal_plus',
    nome: 'Plus Pessoal', nomeCompleto: 'Plus Pessoal - Mensal', tipo: 'personal', nivel: 'plus',
    periodo: 'monthly', duracaoDias: 30, preco: 19.9, checkoutUrl: 'https://pay.cakto.com.br/gbmkspq_506803',
    limites: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true },
    recursos: RECURSOS_PLUS_PESSOAL,
  }),
  plano({
    id: 'personal_plus_yearly', chaveCakto: 'pessoal_plus_anual', familia: 'personal_plus',
    nome: 'Plus Pessoal', nomeCompleto: 'Plus Pessoal - Anual', tipo: 'personal', nivel: 'plus',
    periodo: 'yearly', duracaoDias: 365, preco: 159.9, checkoutUrl: 'https://pay.cakto.com.br/39r822v',
    limites: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true },
    recursos: RECURSOS_PLUS_PESSOAL,
  }),
  plano({
    id: 'personal_pro_monthly', chaveCakto: 'pessoal_pro_mensal', familia: 'personal_pro',
    nome: 'Pro Pessoal', nomeCompleto: 'Pro Pessoal - Mensal', tipo: 'personal', nivel: 'pro',
    periodo: 'monthly', duracaoDias: 30, preco: 34.9, checkoutUrl: 'https://pay.cakto.com.br/rtfgu9x_511525',
    limites: { max_dashboards: 3, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true, advanced_analytics: true, priority_support: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'personal_pro_yearly', chaveCakto: 'pessoal_pro_anual', familia: 'personal_pro',
    nome: 'Pro Pessoal', nomeCompleto: 'Pro Pessoal - Anual', tipo: 'personal', nivel: 'pro',
    periodo: 'yearly', duracaoDias: 365, preco: 279.9, checkoutUrl: 'https://pay.cakto.com.br/jtvtbzy',
    limites: { max_dashboards: 3, ai_requests_per_month: -1, team_members: 1, whatsapp_integration: true, advanced_analytics: true, priority_support: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_plus_monthly', chaveCakto: 'empresarial_plus_mensal', familia: 'business_plus',
    nome: 'Plus Empresarial', nomeCompleto: 'Plus Empresarial - Mensal', tipo: 'business', nivel: 'plus',
    periodo: 'monthly', duracaoDias: 30, preco: 44.9, checkoutUrl: 'https://pay.cakto.com.br/izhudpq_590408',
    limites: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 5, whatsapp_integration: true, advanced_reports: true, priority_support: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_plus_yearly', chaveCakto: 'empresarial_plus_anual', familia: 'business_plus',
    nome: 'Plus Empresarial', nomeCompleto: 'Plus Empresarial - Anual', tipo: 'business', nivel: 'plus',
    periodo: 'yearly', duracaoDias: 365, preco: 360, checkoutUrl: 'https://pay.cakto.com.br/cx7b7r6_590691',
    limites: { max_dashboards: 1, ai_requests_per_month: -1, team_members: 5, whatsapp_integration: true, advanced_reports: true, priority_support: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_pro_monthly', chaveCakto: 'empresarial_pro_mensal', familia: 'business_pro',
    nome: 'PRO Empresarial', nomeCompleto: 'PRO Empresarial - Mensal', tipo: 'business', nivel: 'pro',
    periodo: 'monthly', duracaoDias: 30, preco: 97, checkoutUrl: 'https://pay.cakto.com.br/f7d9hvg_506809',
    limites: { max_dashboards: 2, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_pro_yearly', chaveCakto: 'empresarial_pro_anual', familia: 'business_pro',
    nome: 'PRO Empresarial', nomeCompleto: 'PRO Empresarial - Anual', tipo: 'business', nivel: 'pro',
    periodo: 'yearly', duracaoDias: 365, preco: 770, checkoutUrl: 'https://pay.cakto.com.br/36ffsgo_590699',
    limites: { max_dashboards: 2, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_enterprise_monthly', chaveCakto: 'empresarial_enterprise_mensal', familia: 'business_enterprise',
    nome: 'Super Company', nomeCompleto: 'Super Company - Mensal', tipo: 'business', nivel: 'enterprise',
    periodo: 'monthly', duracaoDias: 30, preco: 147, checkoutUrl: 'https://pay.cakto.com.br/3ei5eox_590705',
    limites: { max_dashboards: 10, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true, export_data: true },
    recursos: RECURSOS_COMPLETOS,
  }),
  plano({
    id: 'business_enterprise_yearly', chaveCakto: 'empresarial_enterprise_anual', familia: 'business_enterprise',
    nome: 'Super Company', nomeCompleto: 'Super Company - Anual', tipo: 'business', nivel: 'enterprise',
    periodo: 'yearly', duracaoDias: 365, preco: 1170, checkoutUrl: 'https://pay.cakto.com.br/t2cpi2a_590702',
    limites: { max_dashboards: 10, ai_requests_per_month: -1, team_members: -1, whatsapp_integration: true, advanced_reports: true, advanced_analytics: true, priority_support: true, custom_categories: true, export_data: true },
    recursos: RECURSOS_COMPLETOS,
  }),
];

/** Cards da tela de planos (textos que já estavam em produção). */
export const FAMILIAS: readonly FamiliaPlano[] = [
  {
    id: 'personal_plus', tipo: 'personal', titulo: 'Plus', descricao: 'Controle financeiro pessoal completo',
    selo: 'Recomendado', destaque: 'recomendado',
    itens: [
      { nome: 'Receitas/Despesas', valor: 'ILIMITADAS' },
      { nome: 'IA no WhatsApp', valor: 'ILIMITADA (texto, áudio, foto)' },
      { nome: 'Dashboard Pessoal', valor: 'Básico' },
      { nome: 'Contas Pessoais', valor: 'Até 1' },
      { nome: 'Suporte', valor: 'Email/WhatsApp' },
    ],
  },
  {
    id: 'personal_pro', tipo: 'personal', titulo: 'Pro', descricao: 'Ideal para casais', selo: 'Popular',
    destaque: 'popular',
    itens: [
      { nome: 'Receitas/Despesas', valor: 'ILIMITADAS' },
      { nome: 'IA no WhatsApp', valor: 'ILIMITADA (texto, áudio, foto)' },
      { nome: 'Dashboard Pessoal', valor: 'Avançado' },
      { nome: 'Contas Pessoais', valor: 'Até 3' },
      { nome: 'Suporte', valor: 'Email/WhatsApp 24/7' },
    ],
  },
  {
    id: 'business_plus', tipo: 'business', titulo: 'Plus', descricao: 'Gestão empresarial completa',
    selo: 'Recomendado', destaque: 'recomendado',
    itens: [
      { nome: 'Receitas/Despesas', valor: 'ILIMITADAS' },
      { nome: 'IA no WhatsApp', valor: 'ILIMITADA (texto, áudio, foto)' },
      { nome: 'Ferramentas empresariais', valor: 'ILIMITADAS' },
      { nome: 'Empresas', valor: 'Até 1' },
      { nome: 'Suporte', valor: 'Email/WhatsApp 24/7' },
    ],
  },
  {
    id: 'business_pro', tipo: 'business', titulo: 'PRO', descricao: 'Finanças pessoais e empresariais juntas',
    selo: 'Popular', destaque: 'popular',
    itens: [
      { nome: 'Receitas/Despesas', valor: 'ILIMITADAS' },
      { nome: 'IA no WhatsApp', valor: 'ILIMITADA (texto, áudio, foto)' },
      { nome: 'Ferramentas empresariais', valor: 'ILIMITADAS' },
      { nome: 'Empresas/Perfis', valor: 'Até 2' },
      { nome: 'Suporte', valor: 'Email/WhatsApp 24/7' },
    ],
  },
  {
    id: 'business_enterprise', tipo: 'business', titulo: 'Super Company', descricao: 'Solução empresarial premium',
    itens: [
      { nome: 'Receitas/Despesas', valor: 'ILIMITADAS' },
      { nome: 'IA no WhatsApp', valor: 'ILIMITADA (texto, áudio, foto)' },
      { nome: 'Ferramentas empresariais', valor: 'ILIMITADAS' },
      { nome: 'Empresas/Perfis', valor: 'Até 10' },
      { nome: 'Suporte', valor: 'Email/WhatsApp 24/7' },
    ],
  },
];

const POR_ID = new Map(PLANOS.map((p) => [p.id, p]));
const POR_CHAVE_CAKTO = new Map(PLANOS.map((p) => [p.chaveCakto, p]));
const POR_NOME_COMPLETO = new Map(PLANOS.map((p) => [p.nomeCompleto.toLowerCase(), p]));

export function planoPorId(id: string | null | undefined): Plano | null {
  return (id && POR_ID.get(id)) || null;
}

export function planoPorChaveCakto(chave: string | null | undefined): Plano | null {
  return (chave && POR_CHAVE_CAKTO.get(chave)) || null;
}

/** Busca pelo plan_name exato gravado pelo webhook (compatibilidade com registros sem plan_id). */
export function planoPorNomeCompleto(nome: string | null | undefined): Plano | null {
  return (nome && POR_NOME_COMPLETO.get(nome.trim().toLowerCase())) || null;
}

export function planoDaFamilia(familia: string, periodo: PeriodoPlano): Plano | null {
  return PLANOS.find((p) => p.familia === familia && p.periodo === periodo) ?? null;
}

/** Palavras de um texto sem acentos e em minúsculas ("PRO Empresarial - Anual" → pro, empresarial, anual). */
function palavrasDe(texto: string): Set<string> {
  return new Set(
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  );
}

/**
 * Plano pelo nome, por palavras inteiras (nome de produto da Cakto, plan_name antigo). Nível: super/enterprise,
 * pro ou plus; empresarial por "empresarial/business/empresa/company/pj"; anual por "anual/annual/yearly/ano".
 */
export function planoPorNomeAproximado(texto: string | null | undefined): Plano | null {
  if (!texto) return null;
  const palavras = palavrasDe(texto);
  const tem = (...ps: string[]) => ps.some((p) => palavras.has(p));
  let nivel: NivelPlano | null = null;
  if (tem('super', 'enterprise')) nivel = 'enterprise';
  else if (tem('pro')) nivel = 'pro';
  else if (tem('plus')) nivel = 'plus';
  if (!nivel) return null;
  const tipo: TipoPlano = nivel === 'enterprise' || tem('empresarial', 'business', 'empresa', 'empresas', 'company', 'pj') ? 'business' : 'personal';
  const periodo: PeriodoPlano = tem('anual', 'annual', 'yearly', 'ano', 'anuais') ? 'yearly' : 'monthly';
  return PLANOS.find((p) => p.tipo === tipo && p.nivel === nivel && p.periodo === periodo) ?? null;
}

/** Nome exibido ao usuário, com período: "Plus Pessoal (anual)". */
export function nomeComercial(plano: Plano): string {
  return `${plano.nome} (${plano.periodo === 'yearly' ? 'anual' : 'mensal'})`;
}

/** Uma linha por família com preços e limite de perfis/empresas (texto para os assistentes de suporte). */
export function resumoDosPlanos(formatarPreco: (valor: number) => string): string {
  return FAMILIAS.map((familia) => {
    const planos = PLANOS.filter((p) => p.familia === familia.id);
    const precos = planos.map((p) => `${formatarPreco(p.preco)}/${p.periodo === 'yearly' ? 'ano' : 'mês'}`).join(' ou ');
    const limite = familia.itens.find((i) => /Contas|Empresas/.test(i.nome));
    return `- ${planos[0]?.nome ?? familia.titulo} (${familia.descricao}): ${precos}${limite ? `; ${limite.nome}: ${limite.valor}` : ''}`;
  }).join('\n');
}
