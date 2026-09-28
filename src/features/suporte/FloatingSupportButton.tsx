import { lazy, Suspense, useState } from 'react';
import { LifeBuoy, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// O chat (com o renderizador de markdown) só é baixado quando o usuário abre o suporte.
const SupportChat = lazy(() => import('@/features/suporte/SupportChat').then((m) => ({ default: m.SupportChat })));

export const FloatingSupportButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none sm:inset-auto sm:bottom-24 sm:right-6">
          <div className="h-full w-full sm:h-[600px] sm:w-[420px] sm:max-h-[80vh] sm:rounded-xl sm:shadow-2xl overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-background">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <SupportChat className="h-full p-3 sm:p-0" />
            </Suspense>
          </div>
        </div>
      )}

      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        aria-label={open ? 'Fechar suporte' : 'Abrir suporte'}
        className="fixed bottom-5 right-5 z-[60] h-12 w-12 rounded-full shadow-lg"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
      </Button>
    </>
  );
};
