import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const FloatingWhatsAppButton: React.FC = () => {
  const whatsappUrl = 'https://wa.me/5587999083662?text=Ol%C3%A1%20Financy';

  return (
    <Button
      data-tutorial="whatsapp-button"
      size="lg"
      className="fixed bottom-6 right-4 lg:right-6 z-50 h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-gentle"
      onClick={() => window.open(whatsappUrl, '_blank')}
      aria-label="Conversar via WhatsApp"
    >
      <MessageCircle className="h-5 w-5 lg:h-6 lg:w-6" />
    </Button>
  );
};
