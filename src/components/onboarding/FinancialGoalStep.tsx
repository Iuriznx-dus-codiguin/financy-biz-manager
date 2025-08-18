import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '@/types/onboarding';

interface FinancialGoalStepProps {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}

const prazosMeta = [
  { value: '3-meses', label: '3 meses' },
  { value: '6-meses', label: '6 meses' },
  { value: '1-ano', label: '1 ano' },
  { value: '2-anos', label: '2 anos' },
  { value: '5-anos', label: '5 anos' },
  { value: 'outro', label: 'Outro prazo' }
];

const metasExemplo = [
  'Juntar R$ 10.000 até dezembro',
  'Sair do vermelho em 6 meses',
  'Investir em renda fixa',
  'Comprar um carro',
  'Fazer uma viagem',
  'Reserva de emergência'
];

export const FinancialGoalStep: React.FC<FinancialGoalStepProps> = ({ data, setData }) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Meta Financeira (Opcional)</h2>
        <p className="text-muted-foreground">
          Defina seu objetivo principal para acompanharmos seu progresso.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <Label htmlFor="meta_financeira">Qual sua meta principal no momento?</Label>
          <Textarea
            id="meta_financeira"
            placeholder="Ex: Juntar R$ 10.000 até dezembro para comprar um carro"
            value={data.meta_financeira || ''}
            onChange={(e) => setData({ ...data, meta_financeira: e.target.value })}
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="valor_meta">Valor da meta (R$) - Opcional</Label>
            <Input
              id="valor_meta"
              type="number"
              placeholder="0,00"
              value={data.valor_meta || ''}
              onChange={(e) => setData({ ...data, valor_meta: Number(e.target.value) || 0 })}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prazo_meta">Prazo desejado</Label>
            <Select
              value={data.prazo_meta || ''}
              onValueChange={(value) => setData({ ...data, prazo_meta: value })}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione um prazo" />
              </SelectTrigger>
              <SelectContent>
                {prazosMeta.map((prazo) => (
                  <SelectItem key={prazo.value} value={prazo.value}>
                    {prazo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-3">💡 Exemplos de metas:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            {metasExemplo.map((meta, index) => (
              <div
                key={index}
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setData({ ...data, meta_financeira: meta })}
              >
                • {meta}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>🎯 Sua meta será automaticamente adicionada ao painel de objetivos</p>
        </div>
      </div>
    </div>
  );
};