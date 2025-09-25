import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const FloatingWhatsAppButton: React.FC = () => {
  const phoneNumber = '+5587999083662';
  const message = 'Olá! Gostaria de conversar sobre o Financy.';
  const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-gentle"
      onClick={() => window.open(whatsappUrl, '_blank')}
      aria-label="Conversar via WhatsApp"
    >
      <Bot className="h-6 w-6" />
    </Button>
  );
};