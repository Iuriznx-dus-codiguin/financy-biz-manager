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

  const DEVELOPER_ACCESS_KEY = 'FINANCY_DEV_2024';

  const handleValidateAccess = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (accessKey !== DEVELOPER_ACCESS_KEY) {
      toast.error('Chave de acesso inválida');
      return;
    }

    setIsValidating(true);
    
    try {
      // Verificar se já existe um registro para este usuário
      const { data: existingSubscriber, error: checkError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSubscriber) {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null, // Acesso ilimitado
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);

        if (updateError) throw updateError;
      } else {
        // Criar novo registro
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            user_id: user.id,
            email: user.email,
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null // Acesso ilimitado
          });

        if (insertError) throw insertError;
      }

      toast.success('Modo desenvolvedor ativado com sucesso! 🚀\nVocê agora tem acesso ilimitado a todas as funcionalidades.');
      
      onClose();
      
      // Recarregar a página após um pequeno delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erro ao ativar modo desenvolvedor:', error);
      toast.error('Erro ao ativar modo desenvolvedor. Tente novamente.');
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