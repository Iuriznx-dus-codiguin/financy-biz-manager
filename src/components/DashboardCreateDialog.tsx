import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building, User, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useToast } from '@/hooks/use-toast';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { celebrate } from '@/utils/celebration';

interface DashboardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dashboardType?: 'personal' | 'business' | null;
}

interface FinalidadePreset {
  value: string;
  label: string;
  /** Sugestão de nome para o dashboard ao escolher esta finalidade. */
  suggestedName: string;
}

const PERSONAL_PRESETS: FinalidadePreset[] = [
  { value: 'eu',       label: 'Eu',          suggestedName: 'Meu Perfil' },
  { value: 'familia',  label: 'Família',     suggestedName: 'Família' },
  { value: 'filho',    label: 'Filho(a)',    suggestedName: 'Filho(a)' },
  { value: 'casa',     label: 'Casa',        suggestedName: 'Casa' },
  { value: 'viagens',  label: 'Viagens',     suggestedName: 'Viagens' },
  { value: 'outro',    label: 'Outro',       suggestedName: '' },
];

const BUSINESS_PRESETS: FinalidadePreset[] = [
  { value: 'vendas',      label: 'Setor de Vendas',     suggestedName: 'Vendas' },
  { value: 'transporte',  label: 'Setor de Transporte', suggestedName: 'Transporte' },
  { value: 'marketing',   label: 'Marketing',           suggestedName: 'Marketing' },
  { value: 'operacional', label: 'Operacional',         suggestedName: 'Operacional' },
  { value: 'filial',      label: 'Filial',              suggestedName: 'Filial' },
  { value: 'pessoal',     label: 'Pessoal do sócio',    suggestedName: 'Pessoal do sócio' },
  { value: 'outro',       label: 'Outro',               suggestedName: '' },
];

const NAME_MAX = 40;

/** Gera nome único acrescentando " 2", " 3"... quando já existe um igual (case-insensitive). */
function ensureUniqueName(desired: string, existing: string[]): string {
  const norm = (s: string) => s.trim().toLowerCase();
  const taken = new Set(existing.map(norm));
  if (!taken.has(norm(desired))) return desired.trim();

  let i = 2;
  while (taken.has(norm(`${desired} ${i}`))) i++;
  return `${desired.trim()} ${i}`;
}

export const DashboardCreateDialog: React.FC<DashboardCreateDialogProps> = ({ open, onOpenChange, dashboardType = null }) => {
  const { dashboards, createDashboard } = useDashboard();
  const { getLimits, subscriptionTier } = useFeatureAccess();
  const { toast } = useToast();
  const { isBusinessPlan } = useUserSubscription();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState<'personal' | 'business'>(dashboardType ?? 'personal');
  const [finalidade, setFinalidade] = useState<string>('');
  const [nomeDashboard, setNomeDashboard] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const limits = getLimits();
  const dashboardsRestantes = limits.maxProfiles === -1 ? 999 : limits.maxProfiles - dashboards.length;
  const isAtLimit = limits.maxProfiles !== -1 && dashboards.length >= limits.maxProfiles;
  const canCreateBusiness = isBusinessPlan();

  const presets = useMemo(
    () => (selectedType === 'business' ? BUSINESS_PRESETS : PERSONAL_PRESETS),
    [selectedType]
  );

  // Sugere nome ao escolher uma finalidade (sem sobrescrever o que o usuário já digitou).
  useEffect(() => {
    if (!finalidade) return;
    const preset = presets.find(p => p.value === finalidade);
    if (preset?.suggestedName) {
      setNomeDashboard(prev => (prev && prev.trim().length > 0 ? prev : preset.suggestedName));
    }
  }, [finalidade, presets]);

  // Reset ao fechar / sincroniza com prop dashboardType ao abrir
  useEffect(() => {
    if (!open) {
      setFinalidade('');
      setNomeDashboard('');
      setSubmitting(false);
      return;
    }
    if (dashboardType) setSelectedType(dashboardType);
  }, [open, dashboardType]);

  const fallbackName = () =>
    selectedType === 'personal'
      ? `Perfil ${dashboards.length + 1}`
      : `Empresa ${dashboards.length + 1}`;

  const handleCreate = async () => {
    if (submitting || isAtLimit) return;

    const trimmed = (nomeDashboard || '').trim();
    if (trimmed.length > NAME_MAX) {
      toast({
        title: 'Nome muito longo',
        description: `Use no máximo ${NAME_MAX} caracteres.`,
        variant: 'destructive',
      });
      return;
    }

    const baseName = trimmed.length > 0 ? trimmed : fallbackName();
    const finalName = ensureUniqueName(baseName, dashboards.map(d => d.name));
    const renamed = finalName !== baseName;

    if (selectedType === 'business' && !canCreateBusiness) {
      toast({
        title: 'Plano Empresarial necessário',
        description: 'Faça upgrade para criar dashboards empresariais.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await createDashboard(finalName, selectedType);

      celebrate({ dedupeKey: `dashboard-created:${finalName}:${Date.now()}`, delay: 250 });
      toast({
        title: 'Dashboard criado!',
        description: renamed
          ? `Já existia um "${baseName}", então criamos "${finalName}".`
          : `"${finalName}" já está ativo e pronto para uso.`,
      });

      onOpenChange(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao criar dashboard:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o dashboard. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Criar novo dashboard
          </DialogTitle>
          <DialogDescription>
            Separe finanças por contexto — família, setores do negócio ou pessoal/empresarial — em um único plano.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Dashboards restantes</span>
            <span className="text-lg font-bold text-primary">{dashboardsRestantes}</span>
          </div>

          {isAtLimit ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/50 dark:border-amber-900">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Limite atingido</p>
                  <p className="text-xs">
                    Seu plano {subscriptionTier} permite {limits.maxProfiles} dashboard(s). Faça upgrade para criar mais.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tipo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedType === 'personal' ? 'default' : 'outline'}
                    size="lg"
                    className="h-16 flex-col gap-1"
                    onClick={() => { setSelectedType('personal'); setFinalidade(''); }}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm">Perfil</span>
                  </Button>

                  {canCreateBusiness ? (
                    <Button
                      variant={selectedType === 'business' ? 'default' : 'outline'}
                      size="lg"
                      className="h-16 flex-col gap-1"
                      onClick={() => { setSelectedType('business'); setFinalidade(''); }}
                    >
                      <Building className="h-5 w-5" />
                      <span className="text-sm">Empresa</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-16 flex-col gap-1 opacity-50 cursor-not-allowed"
                      disabled
                      title="Disponível apenas em planos empresariais"
                    >
                      <Building className="h-5 w-5" />
                      <span className="text-sm">Empresa</span>
                      <span className="text-[10px] text-muted-foreground">Plano Empresarial</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Finalidade — chips adaptativos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Finalidade <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(p => {
                    const active = finalidade === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFinalidade(active ? '' : p.value)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors
                          ${active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {selectedType === 'business'
                    ? 'Ex.: separar transporte de vendas, ou pessoal do sócio do operacional.'
                    : 'Ex.: separar finanças da casa, da família ou das viagens.'}
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="dashboard-name" className="text-sm font-medium">
                  Nome do dashboard
                </Label>
                <Input
                  id="dashboard-name"
                  value={nomeDashboard}
                  onChange={(e) => setNomeDashboard(e.target.value.slice(0, NAME_MAX))}
                  placeholder={selectedType === 'business' ? 'Ex: Setor de Vendas' : 'Ex: Família'}
                  className="h-10"
                  maxLength={NAME_MAX}
                />
                <p className="text-[11px] text-muted-foreground">
                  Se ficar vazio, usaremos <strong>{fallbackName()}</strong>. Nomes duplicados recebem um sufixo automático.
                </p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  As finanças do novo dashboard ficam <strong>totalmente isoladas</strong> das demais — ideal para família, filiais ou setores.
                </AlertDescription>
              </Alert>

              <Button
                size="lg"
                className="w-full"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar dashboard'
                )}
              </Button>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
