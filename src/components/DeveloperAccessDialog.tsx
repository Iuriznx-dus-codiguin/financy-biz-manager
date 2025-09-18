import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Code2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DeveloperAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperAccessDialog: React.FC<DeveloperAccessDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [accessKey, setAccessKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { user } = useAuth();

  const VALID_DEVELOPER_KEYS = [
    'DEV_2024_7K9mQ3xW8vN5',
    'FINCY_DEV_3M8kL2pR9wY',
    'ACCESS_2024_5P7nF4vX9k',
    'MASTER_KEY_8Q2mL6vN3k',
    'SUPER_DEV_9X5kP7mW2v',
    'ULTRA_ACCESS_4K8mP3vX',
    'ELITE_DEV_7M2kL9pW5v',
    'PREMIUM_KEY_6N8kM3vP',
    'ALPHA_DEV_2K9mL7pW4v',
    'BETA_ACCESS_5M8kP6vN',
    'GAMMA_KEY_3L9mP7kW2v',
    'DELTA_DEV_8K5mL6pW9v'
  ];

  const handleValidateAccess = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para acessar esta funcionalidade');
      return;
    }

    if (!accessKey.trim()) {
      toast.error('Por favor, digite uma chave de acesso');
      return;
    }

    if (!VALID_DEVELOPER_KEYS.includes(accessKey.trim())) {
      toast.error('Chave de acesso inválida. Verifique e tente novamente.');
      setAccessKey(''); // Limpar campo após erro
      return;
    }

    setIsValidating(true);
    
    try {
      // Log da tentativa de ativação
      console.log('Ativando modo desenvolvedor para:', user.email);
      
      // Verificar se já existe um registro para este usuário
      const { data: existingSubscriber, error: checkError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Erro ao verificar subscriber existente:', checkError);
      }

      // Atualizar ou criar na tabela subscribers
      if (existingSubscriber) {
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email: user.email,
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null
          });

        if (insertError) throw insertError;
      }

      toast.success('🚀 Modo Desenvolvedor Ativado!', {
        description: 'Acesso ilimitado concedido. Recarregando aplicação...',
        duration: 3000
      });
      
      // Limpar o campo
      setAccessKey('');
      onClose();
      
      // Recarregar a página após um pequeno delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Erro detalhado ao ativar modo desenvolvedor:', error);
      toast.error('Erro interno do sistema. Contate o suporte técnico.', {
        description: 'Código do erro salvo no console para análise.'
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Acesso de Desenvolvedor
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Esta funcionalidade é restrita a desenvolvedores autorizados
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-key">Chave de Acesso</Label>
            <Input
              id="access-key"
              type="password"
              placeholder="Digite a chave de acesso"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidateAccess()}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isValidating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleValidateAccess}
              disabled={!accessKey || isValidating}
              className="flex-1"
            >
              {isValidating ? 'Validando...' : 'Ativar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};