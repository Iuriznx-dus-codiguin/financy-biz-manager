import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from '@/hooks/useAuth';
import { OnboardingProvider } from '@/hooks/useOnboarding';
import { SettingsProvider } from '@/hooks/useSettings';
import { ThemeProvider } from '@/hooks/useTheme';

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <AuthProvider>
      <OnboardingProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </OnboardingProvider>
    </AuthProvider>
  </ThemeProvider>
);
