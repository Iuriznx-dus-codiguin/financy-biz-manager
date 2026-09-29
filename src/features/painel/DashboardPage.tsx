import Dashboard from '@/features/painel/Dashboard';
import { useNavigate } from 'react-router-dom';
import { getRouteForSection } from '@/app/rotas';

export default function DashboardPage() {
  const navigate = useNavigate();
  
  const handleSectionChange = (section: string) => {
    navigate(getRouteForSection(section));
  };

  return <Dashboard setActiveSection={handleSectionChange} />;
}
