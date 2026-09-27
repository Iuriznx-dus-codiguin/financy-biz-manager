// Configuração do Vitest. Objeto simples (sem importar 'vitest/config') porque o Vitest roda
// via `npx` enquanto não entra como devDependency (exige regenerar os lockfiles — decisão D-08).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));

export default {
  resolve: {
    alias: { '@': path.resolve(raiz, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    environment: 'node',
    // Os testes de data rodam no fuso dos clientes para reproduzir os bugs de UTC.
    env: { TZ: 'America/Sao_Paulo' },
  },
};
