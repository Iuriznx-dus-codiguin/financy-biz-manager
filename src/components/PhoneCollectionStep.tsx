import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { validateAndNormalizePhone, savePhoneCorrection, type CorrectionType } from '@/utils/evolutionPhoneValidation';
import { checkPhoneDuplicate } from '@/utils/phoneValidation';
import { BrazilianPhoneInput } from '@/components/ui/BrazilianPhoneInput';

interface PhoneCollectionStepProps {
  onComplete: () => void;
}

export const PhoneCollectionStep: React.FC<PhoneCollectionStepProps> = ({ onComplete }) => {
  const [phone, setPhone] = useState('');
  const [phoneNormalized, setPhoneNormalized] = useState('');
  const [phoneCorrections, setPhoneCorrections] = useState<CorrectionType[]>([]);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePhoneChange = (formatted: string, isValid: boolean, normalized: string) => {
    setPhone(formatted);
    setPhoneNormalized(normalized);
    setIsPhoneValid(isValid);
    setError(null);
    setWarning(null);

    // Executar validação Evolution API
    if (formatted && formatted.length > 5) {
      const result = validateAndNormalizePhone(formatted);
      
      if (!result.isValid) {
        setIsPhoneValid(false);
        setPhoneCorrections([]);
      } else {
        setIsPhoneValid(true);
        setPhoneNormalized(result.normalized!);
        setPhoneCorrections(result.corrections);
        
        // Exibir warnings
        if (result.warning) {
          setWarning(result.warning);
        }
        
        // Exibir mensagens de correção
        if (result.corrections.length > 0) {
          const correctionMsg = result.corrections.map(c => c.message).join('\n');
          setWarning(correctionMsg);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = validateAndNormalizePhone(phone);
    if (!result.isValid) {
      setError(result.error || 'Número de telefone inválido');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não encontrado');
        setLoading(false);
        return;
      }

      // Verificar duplicata usando formato normalizado
      const { isDuplicate, error: dupError } = await checkPhoneDuplicate(result.normalized!, user.id);

      if (dupError) {
        setError(dupError);
        setLoading(false);
        return;
      }

      if (isDuplicate) {
        setError('⚠️ Este número de telefone já está cadastrado em outra conta.');
        setLoading(false);
        return;
      }

      // Salvar número normalizado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ telefone: result.normalized })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao salvar telefone:', updateError);
        setError('Erro ao salvar telefone. Tente novamente.');
        setLoading(false);
        return;
      }

      // Salvar auditoria se houver correções
      if (result.corrections.length > 0) {
        await savePhoneCorrection(
          user.id,
          phone,
          result.normalized!,
          result.corrections,
          'phone_collection'
        );
      }

      toast({
        title: "✅ Telefone cadastrado!",
        description: result.corrections.length > 0 
          ? `Número salvo como: ${result.normalized}\n\nCorreções aplicadas: ${result.corrections.map(c => c.message).join(', ')}`
          : `Número salvo como: ${result.normalized}`,
      });

      onComplete();
    } catch (error) {
      console.error('Erro ao cadastrar telefone:', error);
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
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {warning && isPhoneValid && (
              <Alert className="border-warning/20 bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning whitespace-pre-line">
                  <strong>Correção aplicada:</strong><br />
                  {warning}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <BrazilianPhoneInput
                label="Número do WhatsApp"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Digite seu número"
                showValidationFeedback={true}
              />

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading || !isPhoneValid}
                  className="w-full rounded-xl h-14 text-base font-semibold bg-green-600 hover:bg-green-700 text-white transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
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
