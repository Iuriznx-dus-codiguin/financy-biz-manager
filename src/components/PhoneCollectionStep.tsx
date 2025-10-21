import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, MessageCircle, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { validatePhoneNumber, checkPhoneDuplicate } from '@/utils/phoneValidation';

interface PhoneCollectionStepProps {
  onComplete: () => void;
}

export const PhoneCollectionStep: React.FC<PhoneCollectionStepProps> = ({ onComplete }) => {
  const [phone, setPhone] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    // Remove tudo que não for número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const validatePhone = (phoneValue: string) => {
    const numbers = phoneValue.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const handlePhoneChange = (value: string, isConfirm = false) => {
    const formatted = formatPhone(value);
    if (isConfirm) {
      setConfirmPhone(formatted);
    } else {
      setPhone(formatted);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePhone(phone)) {
      setError('Por favor, insira um telefone válido com 11 dígitos');
      return;
    }

    if (phone !== confirmPhone) {
      setError('Os números de telefone não coincidem');
      return;
    }

    // Validação robusta com libphonenumber-js
    const validation = validatePhoneNumber(phone, 'BR');
    if (!validation.isValid) {
      setError(validation.error || 'Número de telefone inválido');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não encontrado');
        return;
      }

      // Usar o formato E.164 para verificação e salvamento
      const phoneE164 = validation.e164!;

      // Verificar duplicata usando utilitário
      const { isDuplicate, error: dupError } = await checkPhoneDuplicate(phoneE164, user.id);

      if (dupError) {
        setError(dupError);
        return;
      }

      if (isDuplicate) {
        setError('⚠️ Este número de telefone já está cadastrado em outra conta.');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ telefone: phoneE164 })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao salvar telefone:', updateError);
        
        // Verificar se é erro de constraint de unicidade
        if (updateError.code === '23505') {
          setError('⚠️ Este número de telefone já está cadastrado.');
          return;
        }
        
        setError('Erro ao salvar telefone. Tente novamente.');
        return;
      }

      toast({
        title: "✅ Telefone cadastrado!",
        description: "Agora você poderá usar nossos serviços de IA no WhatsApp.",
      });

      onComplete();
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500/10 via-background to-green-600/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-3xl shadow-2xl border border-green-200/50 dark:border-green-800/50 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center p-8 bg-gradient-to-r from-green-500 to-green-600 rounded-t-3xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/20 mb-4"
            >
              <MessageCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Cadastre seu WhatsApp
            </h1>
            <p className="text-green-100 text-sm">
              Para usar nossos serviços de IA
            </p>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <MessageCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>🤖 IA no WhatsApp disponível!</strong><br />
                Cadastre seu telefone para receber insights financeiros, alertas personalizados e suporte via WhatsApp.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="border-destructive/20 bg-destructive/5 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Número do WhatsApp
                </Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="rounded-xl h-14 pl-12 pr-4 border-2 focus:border-green-500 transition-all bg-background/50"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPhone" className="text-sm font-medium">
                  Confirme o número
                </Label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPhone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={confirmPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, true)}
                    className="rounded-xl h-14 pl-12 pr-4 border-2 focus:border-green-500 transition-all bg-background/50"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading || !phone || !confirmPhone}
                  className="w-full rounded-xl h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Cadastrar WhatsApp
                    </>
                  )}
                </Button>

              </div>
            </form>

            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Receba insights financeiros automáticos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Alertas de vencimentos e metas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Suporte personalizado via IA</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};