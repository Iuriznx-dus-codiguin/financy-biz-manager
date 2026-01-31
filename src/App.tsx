
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { SectionTutorialsProvider } from "@/hooks/useSectionTutorials";
import { AppProvider } from "@/contexts/AppContext";
import { DashboardProvider } from "@/hooks/useDashboard";
import { ThemeProvider } from "@/hooks/useTheme";
import { SettingsProvider } from "@/hooks/useSettings";
import { UserContextProvider } from "@/hooks/useUserContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <SettingsProvider>
              <OnboardingProvider>
                <SectionTutorialsProvider>
                  <DashboardProvider>
                    <UserContextProvider>
                      <AppProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <Routes>
                          {/* Rota raiz redireciona para dashboard */}
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          
                          {/* Rota de login */}
                          <Route path="/login" element={<LoginPage />} />
                          
                          {/* Rotas protegidas com layout compartilhado */}
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
                          
                          {/* Página 404 */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                      </AppProvider>
                    </UserContextProvider>
                  </DashboardProvider>
                </SectionTutorialsProvider>
              </OnboardingProvider>
            </SettingsProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
