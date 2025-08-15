import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Code2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PropriedadesDialogoAcessoDesenvolvedor {
  estaAberto: boolean;
  aoFechar: () => void;
}

export const DialogoAcessoDesenvolvedor: React.FC<PropriedadesDialogoAcessoDesenvolvedor> = ({
  estaAberto,
  aoFechar
}) => {
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [estaValidando, setEstaValidando] = useState(false);
  const { user: usuario } = useAuth();

  const CHAVE_ACESSO_DESENVOLVEDOR = 'FINANCY_DEV_2024';

  const validarAcesso = async () => {
    if (!usuario) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (chaveAcesso !== CHAVE_ACESSO_DESENVOLVEDOR) {
      toast.error('Chave de acesso inválida');
      return;
    }

    setEstaValidando(true);
    
    try {
      // Verificar se já existe um registro para este usuário
      const { data: assinanteExistente, error: erroVerificacao } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', usuario.email)
        .single();

      if (erroVerificacao && erroVerificacao.code !== 'PGRST116') {
        throw erroVerificacao;
      }

      if (assinanteExistente) {
        // Atualizar registro existente
        const { error: erroAtualizacao } = await supabase
          .from('subscribers')
          .update({
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null, // Acesso ilimitado
            updated_at: new Date().toISOString()
          })
          .eq('email', usuario.email);

        if (erroAtualizacao) throw erroAtualizacao;
      } else {
        // Criar novo registro
        const { error: erroInsercao } = await supabase
          .from('subscribers')
          .insert({
            user_id: usuario.id,
            email: usuario.email,
            subscribed: true,
            subscription_tier: 'developer',
            subscription_end: null // Acesso ilimitado
          });

        if (erroInsercao) throw erroInsercao;
      }

      toast.success('Modo desenvolvedor ativado com sucesso! 🚀\nVocê agora tem acesso ilimitado a todas as funcionalidades.');
      
      aoFechar();
      
      // Recarregar a página após um pequeno delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (erro) {
      console.error('Erro ao ativar modo desenvolvedor:', erro);
      toast.error('Erro ao ativar modo desenvolvedor. Tente novamente.');
    } finally {
      setEstaValidando(false);
    }
  };

  return (
    <Dialog open={estaAberto} onOpenChange={aoFechar}>
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
            <Label htmlFor="chave-acesso">Chave de Acesso</Label>
            <Input
              id="chave-acesso"
              type="password"
              placeholder="Digite a chave de acesso"
              value={chaveAcesso}
              onChange={(e) => setChaveAcesso(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && validarAcesso()}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={aoFechar}
              className="flex-1"
              disabled={estaValidando}
            >
              Cancelar
            </Button>
            <Button
              onClick={validarAcesso}
              disabled={!chaveAcesso || estaValidando}
              className="flex-1"
            >
              {estaValidando ? 'Validando...' : 'Ativar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Manter export compatível para uso existente
export const DeveloperAccessDialog = DialogoAcessoDesenvolvedor;