
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Adicionar handler global para erros não capturados
window.addEventListener('error', (event) => {
  console.error('Erro global capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejeitada não tratada:', event.reason);
});

createRoot(root).render(<App />);
