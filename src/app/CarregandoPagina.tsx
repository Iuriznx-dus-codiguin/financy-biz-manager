import { Loader2 } from 'lucide-react';

export const CarregandoPagina = ({ telaCheia = false }: { telaCheia?: boolean }) => (
  <div
    className={`flex items-center justify-center ${telaCheia ? 'min-h-screen bg-background' : 'min-h-[40vh]'}`}
    role="status"
    aria-live="polite"
  >
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    <span className="sr-only">Carregando…</span>
  </div>
);
