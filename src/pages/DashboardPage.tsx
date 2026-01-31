import Dashboard from '@/components/sections/Dashboard';
import { useNavigate } from 'react-router-dom';

const sectionToRoute: Record<string, string> = {
  'painel': '/dashboard',
  'receitas': '/receitas',
  'despesas': '/despesas',
  'categorias': '/categorias',
  'impostos': '/impostos',
  'equipe': '/equipe',
  'metas': '/metas',
  'relatorios': '/relatorios',
  'fechamento': '/fechamento',
  'agentes-ia': '/agentes-ia',
  'assinatura': '/assinatura',
  'configuracoes': '/configuracoes',
  'ajuda': '/ajuda',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  
  const handleSectionChange = (section: string) => {
    const route = sectionToRoute[section] || '/dashboard';
    navigate(route);
  };

  return <Dashboard setActiveSection={handleSectionChange} />;
}
