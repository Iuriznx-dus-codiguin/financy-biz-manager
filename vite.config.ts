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
    // Bibliotecas pesadas em chunks próprios, com cache independente do código
    // da aplicação: exceljs/jspdf só são baixados quando o usuário exporta algo,
    // e recharts só quando abre uma tela com gráfico.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-spreadsheet': ['exceljs'],
          'vendor-pdf': ['jspdf'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Abaixo deste teto o aviso do Rollup volta a ser sinal, não ruído.
    chunkSizeWarningLimit: 700,
  },
}));
