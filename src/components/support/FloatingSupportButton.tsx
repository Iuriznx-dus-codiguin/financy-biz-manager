import { useState } from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupportChat } from '@/components/support/SupportChat';

export const FloatingSupportButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none sm:inset-auto sm:bottom-24 sm:right-6">
          <div className="h-full w-full sm:h-[600px] sm:w-[420px] sm:max-h-[80vh] sm:rounded-xl sm:shadow-2xl overflow-hidden">
            <SupportChat className="h-full p-3 sm:p-0" />
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
