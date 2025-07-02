
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Handler global para erros não capturados
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler] Erro capturado:', event.error);
  console.error('[Global Error Handler] Filename:', event.filename);
  console.error('[Global Error Handler] Line:', event.lineno);
  console.error('[Global Error Handler] Column:', event.colno);
});

// Handler para promises rejeitadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global Promise Handler] Promise rejeitada:', event.reason);
  console.error('[Global Promise Handler] Promise:', event.promise);
});

// Prevenir erros de removeChild com observer
const observeThemeChanges = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        console.log('[Theme Observer] Mudança de classe detectada:', mutation.target);
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });
};

// Inicializar observer após DOM carregar
document.addEventListener('DOMContentLoaded', observeThemeChanges);

createRoot(root).render(<App />);
