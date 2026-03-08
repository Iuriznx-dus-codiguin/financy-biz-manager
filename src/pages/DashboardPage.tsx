import Dashboard from '@/components/sections/Dashboard';
import { useNavigate } from 'react-router-dom';
import { getRouteForSection } from '@/constants/routes';

export default function DashboardPage() {
  const navigate = useNavigate();
  
  const handleSectionChange = (section: string) => {
    navigate(getRouteForSection(section));
  };

  return <Dashboard setActiveSection={handleSectionChange} />;
}
