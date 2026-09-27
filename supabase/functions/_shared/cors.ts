// CORS por allowlist. Chamadas das functions usam token Bearer (não cookies), então o CORS é defesa
// em profundidade: evita que outras páginas leiam respostas, mas não substitui a autenticação.

const ORIGENS_FIXAS = [
  'https://app.financy.site',
  'https://financy.site',
  'https://www.financy.site',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

// Preview e publicação do projeto no Lovable (id do projeto no subdomínio).
const PROJETO_LOVABLE = '9282ef49-6210-4d01-b2e5-859e8a275941';
const PREVIEW_LOVABLE = new RegExp(
  `^https://([a-z0-9-]+--)?${PROJETO_LOVABLE}(-[a-z0-9-]+)?\\.(lovable\\.app|lovableproject\\.com)$`,
);

function origensExtras(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function origemPermitida(origem: string | null): boolean {
  if (!origem) return false;
  return ORIGENS_FIXAS.includes(origem) || PREVIEW_LOVABLE.test(origem) || origensExtras().includes(origem);
}

export function cabecalhosCors(req: Request): Record<string, string> {
  const origem = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origemPermitida(origem) ? origem! : ORIGENS_FIXAS[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    Vary: 'Origin',
  };
}
