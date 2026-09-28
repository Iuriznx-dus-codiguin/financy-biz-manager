import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Requisições canceladas (navegação, recarga ou lock de sessão do supabase-js) são esperadas.
// Só AbortError é silenciado; qualquer outro erro continua aparecendo.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { name?: string } | undefined;
  if (reason?.name === 'AbortError') event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
