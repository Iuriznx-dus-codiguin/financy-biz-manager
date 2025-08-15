import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from '@/hooks/useAuth';
import { OnboardingProvider } from '@/hooks/useOnboarding';

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <OnboardingProvider>
      <App />
    </OnboardingProvider>
  </AuthProvider>
);
