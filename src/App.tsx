import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/AppProviders";
import { AuthenticatedLayout } from "@/app/AuthenticatedLayout";
import { AuthGuard } from "@/app/guards/AuthGuard";
import { AdminGuard } from "@/app/guards/AdminGuard";
import { carregarPagina } from "@/app/carregarPagina";
import { CarregandoPagina } from "@/app/CarregandoPagina";

// Cada página vira um chunk próprio: o carregamento inicial não inclui gráficos, planilhas e PDF.
const NotFound = carregarPagina(() => import("@/app/NotFound"));
const LoginPage = carregarPagina(() => import("@/features/auth/LoginPage"));
const DashboardPage = carregarPagina(() => import("@/features/painel/DashboardPage"));
const ReceitasPage = carregarPagina(() => import("@/features/lancamentos/ReceitasPage"));
const DespesasPage = carregarPagina(() => import("@/features/lancamentos/DespesasPage"));
const CategoriasPage = carregarPagina(() => import("@/features/categorias/CategoriasPage"));
const ImpostosPage = carregarPagina(() => import("@/features/impostos/ImpostosPage"));
const EquipePage = carregarPagina(() => import("@/features/equipe/EquipePage"));
const MetasPage = carregarPagina(() => import("@/features/metas/MetasPage"));
const RelatoriosPage = carregarPagina(() => import("@/features/relatorios/RelatoriosPage"));
const FechamentoPage = carregarPagina(() => import("@/features/fechamento/FechamentoPage"));
const AgentesIAPage = carregarPagina(() => import("@/features/ia/AgentesIAPage"));
const AssinaturaPage = carregarPagina(() => import("@/features/assinatura/AssinaturaPage"));
const ConfiguracoesPage = carregarPagina(() => import("@/features/configuracoes/ConfiguracoesPage"));
const AjudaPage = carregarPagina(() => import("@/features/suporte/AjudaPage"));
const SuportePage = carregarPagina(() => import("@/features/suporte/SuportePage"));
const AuditoriaWebhooksPage = carregarPagina(() => import("@/features/admin/AuditoriaWebhooksPage"));
const AdminSuportePage = carregarPagina(() => import("@/features/suporte/AdminSuportePage"));

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

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<CarregandoPagina telaCheia />}>
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

              <Route path="/auditoria/webhooks-cakto" element={<AdminGuard><AuditoriaWebhooksPage /></AdminGuard>} />
              <Route path="/admin/suporte" element={<AdminGuard><AdminSuportePage /></AdminGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
