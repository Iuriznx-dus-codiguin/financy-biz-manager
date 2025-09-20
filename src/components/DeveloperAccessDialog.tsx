import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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


  const handleValidateAccess = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para acessar esta funcionalidade');
      return;
    }

    if (!accessKey.trim()) {
      toast.error('Por favor, digite uma chave de acesso');
      return;
    }

    setIsValidating(true);
    
    try {
      // Use secure server-side validation
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        'validate-developer-key', 
        {
          body: { 
            key: accessKey.trim(), 
            userEmail: user.email 
          }
        }
      );

      if (validationError) {
        throw new Error('Erro na validação: ' + validationError.message);
      }

      if (!validationResult?.valid) {
        toast.error('Chave de acesso inválida. Verifique e tente novamente.');
        setAccessKey('');
        return;
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
          <DialogDescription>
            Digite a chave de acesso de desenvolvedor para ativar recursos avançados.
          </DialogDescription>
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