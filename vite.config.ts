import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Só as bibliotecas que realmente fazem parte do carregamento inicial
        // ganham chunk fixo — assim têm hash estável e ficam em cache entre
        // deploys.
        //
        // recharts, exceljs e jspdf ficam DE FORA de propósito: são usados
        // apenas por rotas lazy e por imports dinâmicos, e listá-las aqui
        // forçava uma aresta de import estático a partir do chunk de entrada,
        // anulando o carregamento sob demanda. Deixar o Rollup dividir
        // sozinho mantém cada uma no chunk da rota que a utiliza.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Abaixo deste teto o aviso do Rollup volta a ser sinal, não ruído.
    chunkSizeWarningLimit: 700,
  },
}));
