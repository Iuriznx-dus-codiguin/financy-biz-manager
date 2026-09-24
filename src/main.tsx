import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Cancelled requests (e.g. auth lock / fetch aborted on navigation or reload)
// are expected and harmless — prevent them from surfacing as unhandled errors.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { name?: string; message?: string } | undefined;
  if (
    reason?.name === 'AbortError' ||
    (typeof reason?.message === 'string' && reason.message.includes('signal is aborted'))
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
