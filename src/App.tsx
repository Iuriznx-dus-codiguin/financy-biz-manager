import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { AdminGuard } from "@/components/guards/AdminGuard";

/**
 * Redireciona "/" para "/dashboard" preservando o hash da URL.
 * Crítico para fluxos de verificação de e-mail / OAuth do Supabase,
 * que retornam tokens em `window.location.hash` (#access_token=...).
 * Sem isso, o <Navigate> remove o hash antes do supabase-js processá-lo
 * e a sessão nunca é criada — usuário cai de volta no login.
 */
const RootRedirect = () => {
  const { hash, search } = useLocation();
  return <Navigate to={`/dashboard${search}${hash}`} replace />;
};

/**
 * Páginas carregadas sob demanda.
 *
 * Com os imports estáticos anteriores o build gerava um único bundle de ~3,8 MB
 * (1 MB gzip): quem abria a tela de login baixava junto Relatórios, exceljs,
 * jspdf e html2canvas antes do primeiro render.
 */
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ReceitasPage = lazy(() => import("./pages/ReceitasPage"));
const DespesasPage = lazy(() => import("./pages/DespesasPage"));
const CategoriasPage = lazy(() => import("./pages/CategoriasPage"));
const ImpostosPage = lazy(() => import("./pages/ImpostosPage"));
const EquipePage = lazy(() => import("./pages/EquipePage"));
const MetasPage = lazy(() => import("./pages/MetasPage"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage"));
const FechamentoPage = lazy(() => import("./pages/FechamentoPage"));
const AgentesIAPage = lazy(() => import("./pages/AgentesIAPage"));
const AssinaturaPage = lazy(() => import("./pages/AssinaturaPage"));
const ConfiguracoesPage = lazy(() => import("./pages/ConfiguracoesPage"));
const AjudaPage = lazy(() => import("./pages/AjudaPage"));
const SuportePage = lazy(() => import("./pages/SuportePage"));
const AuditoriaWebhooksPage = lazy(() => import("./pages/AuditoriaWebhooksPage"));
const AdminSuportePage = lazy(() => import("./pages/AdminSuportePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="sr-only">Carregando página…</span>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={
              <AuthGuard>
                <AuthenticatedLayout />
              </AuthGuard>
            }>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/receitas" element={<ReceitasPage />} />
              <Route path="/despesas" element={<DespesasPage />} />
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="/impostos" element={<ImpostosPage />} />
              <Route path="/equipe" element={<EquipePage />} />
              <Route path="/metas" element={<MetasPage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/fechamento" element={<FechamentoPage />} />
              <Route path="/agentes-ia" element={<AgentesIAPage />} />
              <Route path="/assinatura" element={<AssinaturaPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/ajuda" element={<AjudaPage />} />
              <Route path="/suporte" element={<SuportePage />} />

              {/* Áreas restritas atrás de um guard de rota: antes cada página
                  precisava lembrar de checar o papel por conta própria. */}
              <Route element={<AdminGuard />}>
                <Route path="/auditoria/webhooks-cakto" element={<AuditoriaWebhooksPage />} />
                <Route path="/admin/suporte" element={<AdminSuportePage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
