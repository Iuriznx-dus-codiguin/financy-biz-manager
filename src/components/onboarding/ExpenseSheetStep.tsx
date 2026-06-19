import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { OnboardingData, GastoInicial } from '@/types/onboarding';
import { useToast } from '@/hooks/use-toast';
import { SpreadsheetImportExport } from '@/components/SpreadsheetImportExport';
import { parseNumber } from '@/utils/spreadsheetIO';

interface ExpenseSheetStepProps {
  data: OnboardingData;
  setData: (data: OnboardingData) => void;
}

const categoriasPessoais = [
  'Moradia',
  'Alimentação', 
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Outros'
];

const categoriasEmpresariais = [
  'Folha de Pagamento',
  'Fornecedores',
  'Aluguel e Estrutura',
  'Marketing e Vendas',
  'Tecnologia e Softwares',
  'Manutenção e Serviços',
  'Impostos e Taxas',
  'Transporte e Logística',
  'Treinamentos e RH',
  'Outros'
];

const descricoesEmpresariais = {
  'Folha de Pagamento': 'Salários, pró-labore, encargos trabalhistas',
  'Fornecedores': 'Compra de mercadorias, insumos, matéria-prima',
  'Aluguel e Estrutura': 'Aluguel, condomínio, energia, água, internet',
  'Marketing e Vendas': 'Anúncios pagos, softwares de CRM, comissões',
  'Tecnologia e Softwares': 'Hospedagem, SaaS, licenças, ferramentas digitais',
  'Manutenção e Serviços': 'Limpeza, manutenção de equipamentos, segurança',
  'Impostos e Taxas': 'ISS, ICMS, IRPJ, taxas bancárias, MEI/Simples',
  'Transporte e Logística': 'Combustível, fretes, motoboy, transporte de mercadorias',
  'Treinamentos e RH': 'Cursos, capacitação de funcionários, benefícios',
  'Outros': 'Despesas diversas e não recorrentes'
};

const formasPagamentoPadrao = {
  'Folha de Pagamento': 'Transferência',
  'Fornecedores': 'Boleto',
  'Aluguel e Estrutura': 'Boleto',
  'Marketing e Vendas': 'Cartão de Crédito',
  'Tecnologia e Softwares': 'Cartão de Crédito',
  'Manutenção e Serviços': 'PIX',
  'Impostos e Taxas': 'Boleto',
  'Transporte e Logística': 'Cartão de Débito',
  'Treinamentos e RH': 'Cartão de Crédito',
  'Outros': 'PIX'
};

const formasPagamento = [
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'PIX',
  'Transferência',
  'Boleto'
];

export const ExpenseSheetStep: React.FC<ExpenseSheetStepProps> = ({ data, setData }) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);

  const gastos = data.gastos_iniciais || [];
  const isEmpresarial = data.user_type === 'empresarial';
  const categorias = isEmpresarial ? categoriasEmpresariais : categoriasPessoais;

  const adicionarGasto = () => {
    const novoGasto: GastoInicial = {
      id: Date.now().toString(),
      categoria: 'Outros',
      descricao: '',
      valor_mensal: 0,
      forma_pagamento: isEmpresarial ? 'PIX' : 'Dinheiro'
    };

    setData({
      ...data,
      gastos_iniciais: [...gastos, novoGasto]
    });
    setEditingId(novoGasto.id);
  };

  const removerGasto = (id: string) => {
    setData({
      ...data,
      gastos_iniciais: gastos.filter(g => g.id !== id)
    });
  };

  const atualizarGasto = (id: string, campo: keyof GastoInicial, valor: any) => {
    setData({
      ...data,
      gastos_iniciais: gastos.map(g => 
        g.id === id ? { ...g, [campo]: valor } : g
      )
    });
  };

  const gerarGastosPadrao = () => {
    const gastosPadrao: GastoInicial[] = categorias.map((categoria, index) => ({
      id: `default-${index}`,
      categoria,
      descricao: isEmpresarial 
        ? descricoesEmpresariais[categoria as keyof typeof descricoesEmpresariais] 
        : `Gastos com ${categoria.toLowerCase()}`,
      valor_mensal: 0,
      forma_pagamento: isEmpresarial 
        ? formasPagamentoPadrao[categoria as keyof typeof formasPagamentoPadrao] 
        : 'Cartão de Débito'
    }));

    setData({
      ...data,
      gastos_iniciais: gastosPadrao
    });

    toast({
      title: "Planilha gerada!",
      description: "Agora você pode editar os valores conforme sua realidade."
    });
  };


  const importarPlanilha = async (rows: Record<string, any>[]) => {
    const importados: GastoInicial[] = rows
      .map((row, index) => {
        const categoria = String(row.categoria ?? row.Categoria ?? 'Outros').trim() || 'Outros';
        const descricao = String(row.descricao ?? row.Descrição ?? row.Descricao ?? '').trim();
        const valor = parseNumber(row.valor_mensal ?? row.valor ?? row.Valor);
        const forma = String(
          row.forma_pagamento ?? row.formaPagamento ?? row['Forma de Pagamento'] ?? (isEmpresarial ? 'PIX' : 'Dinheiro')
        ).trim();
        return {
          id: `imported-${Date.now()}-${index}`,
          categoria,
          descricao,
          valor_mensal: valor,
          forma_pagamento: forma,
        } as GastoInicial;
      })
      .filter((g) => g.descricao || g.valor_mensal > 0);

    setData({ ...data, gastos_iniciais: [...gastos, ...importados] });
    return { inserted: importados.length, skipped: rows.length - importados.length };
  };

  const totalGastos = gastos.reduce((total, gasto) => total + gasto.valor_mensal, 0);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isEmpresarial ? 'Planilha de Custos Operacionais (Opcional)' : 'Planilha Inicial de Gastos (Opcional)'}
        </h2>
        <p className="text-muted-foreground">
          {isEmpresarial 
            ? 'Configure os custos operacionais da sua empresa para personalizar dashboards e relatórios.'
            : 'Registre seus gastos cotidianos para personalizar seu dashboard e relatórios.'
          }
        </p>
        <p className="text-xs text-muted-foreground">
          💡 Use Excel ou Google Sheets — baixe o modelo, preencha e importe de volta (.xlsx ou .csv).
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center items-center">
        <Button onClick={gerarGastosPadrao} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Gerar Categorias Padrão
        </Button>

        <Button onClick={adicionarGasto} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {isEmpresarial ? 'Adicionar Custo' : 'Adicionar Gasto'}
        </Button>

        <SpreadsheetImportExport
          entityLabel={isEmpresarial ? 'Custos' : 'Gastos'}
          fileBaseName={isEmpresarial ? 'custos-operacionais' : 'gastos-iniciais'}
          templateColumns={[
            { key: 'categoria', header: 'categoria', example: categorias[0] },
            {
              key: 'descricao',
              header: 'descricao',
              example: isEmpresarial ? 'Salário equipe' : 'Supermercado',
            },
            { key: 'valor_mensal', header: 'valor_mensal', example: 1200 },
            {
              key: 'forma_pagamento',
              header: 'forma_pagamento',
              example: isEmpresarial ? 'Transferência' : 'Cartão de Débito',
            },
          ]}
          getExportRows={
            gastos.length > 0
              ? () =>
                  gastos.map((g) => ({
                    categoria: g.categoria,
                    descricao: g.descricao,
                    valor_mensal: g.valor_mensal,
                    forma_pagamento: g.forma_pagamento,
                  }))
              : undefined
          }
          onImport={importarPlanilha}
          compact={false}
        />
      </div>

      {gastos.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor Mensal (R$)</TableHead>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((gasto) => (
                <TableRow key={gasto.id}>
                  <TableCell>
                    <Select
                      value={gasto.categoria}
                      onValueChange={(value) => atualizarGasto(gasto.id, 'categoria', value)}
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={gasto.descricao}
                      onChange={(e) => atualizarGasto(gasto.id, 'descricao', e.target.value)}
                      placeholder={isEmpresarial ? "Ex: Salário funcionários, fornecedor ABC..." : "Ex: Supermercado, combustível..."}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={gasto.valor_mensal}
                      onChange={(e) => atualizarGasto(gasto.id, 'valor_mensal', Number(e.target.value) || 0)}
                      placeholder="0,00"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={gasto.forma_pagamento}
                      onValueChange={(value) => atualizarGasto(gasto.id, 'forma_pagamento', value)}
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map(forma => (
                          <SelectItem key={forma} value={forma}>{forma}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerGasto(gasto.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="p-4 bg-muted/50 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total mensal:</span>
              <span className="font-bold text-lg">R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {gastos.length === 0 && (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
            {isEmpresarial ? 'Nenhum custo operacional adicionado ainda.' : 'Nenhum gasto adicionado ainda.'}
          </p>
          <Button onClick={gerarGastosPadrao} className="mx-auto">
            <Plus className="w-4 h-4 mr-2" />
            Começar com categorias padrão
          </Button>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>💡 Você pode pular esta etapa, mas recomendamos preenchê-la para uma melhor experiência</p>
      </div>
    </div>
  );
};