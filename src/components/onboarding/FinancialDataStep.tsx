import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingData } from '@/types/onboarding';

interface FinancialDataStepProps {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}

export const FinancialDataStep: React.FC<FinancialDataStepProps> = ({ data, setData }) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Dados Financeiros Básicos</h2>
        <p className="text-muted-foreground">
          Conte-nos sobre sua situação financeira atual para personalizar melhor sua experiência.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="saldo_conta">Saldo atual em conta (R$)</Label>
          <Input
            id="saldo_conta"
            type="number"
            placeholder="0,00"
            value={data.saldo_conta || ''}
            onChange={(e) => setData({ ...data, saldo_conta: Number(e.target.value) || 0 })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="saldo_carteira">Saldo em carteira/dinheiro (R$)</Label>
          <Input
            id="saldo_carteira"
            type="number"
            placeholder="0,00"
            value={data.saldo_carteira || ''}
            onChange={(e) => setData({ ...data, saldo_carteira: Number(e.target.value) || 0 })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dividas_atuais">Dívidas atuais (R$) - Opcional</Label>
          <Input
            id="dividas_atuais"
            type="number"
            placeholder="0,00"
            value={data.dividas_atuais || ''}
            onChange={(e) => setData({ ...data, dividas_atuais: Number(e.target.value) || 0 })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receita_mensal">Receita mensal média (R$)</Label>
          <Input
            id="receita_mensal"
            type="number"
            placeholder="0,00"
            value={data.receita_mensal || ''}
            onChange={(e) => setData({ ...data, receita_mensal: Number(e.target.value) || 0 })}
            className="h-12"
          />
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 Esses dados nos ajudam a criar insights personalizados para você</p>
      </div>
    </div>
  );
};