import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { AuthGuard } from "@/components/guards/AuthGuard";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ReceitasPage from "./pages/ReceitasPage";
import DespesasPage from "./pages/DespesasPage";
import CategoriasPage from "./pages/CategoriasPage";
import ImpostosPage from "./pages/ImpostosPage";
import EquipePage from "./pages/EquipePage";
import MetasPage from "./pages/MetasPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import FechamentoPage from "./pages/FechamentoPage";
import AgentesIAPage from "./pages/AgentesIAPage";
import AssinaturaPage from "./pages/AssinaturaPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import AjudaPage from "./pages/AjudaPage";

const App = () => (
  <ErrorBoundary>
    <AppProviders>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
