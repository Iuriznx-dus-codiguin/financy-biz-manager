import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Filter, Search, Trash2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { validateNumericInput, validateTextInput, validateDate, sanitizeText } from '@/utils/validation';

const Despesas = () => {
  const { despesas, addDespesa, deleteDespesa } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [novaDespesa, setNovaDespesa] = useState({
    data: '',
    descricao: '',
    categoria: '',
    fornecedor: '',
    valor: '',
    formaPagamento: ''
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validar data
    const dateValidation = validateDate(novaDespesa.data);
    if (!dateValidation.isValid) {
      errors.data = dateValidation.error!;
    }

    // Validar descrição
    const descricaoValidation = validateTextInput(novaDespesa.descricao, 255);
    if (!descricaoValidation.isValid) {
      errors.descricao = descricaoValidation.error!;
    }

    // Validar categoria
    if (!novaDespesa.categoria) {
      errors.categoria = 'Categoria é obrigatória';
    }

    // Validar fornecedor (opcional, mas se preenchido deve ser válido)
    if (novaDespesa.fornecedor) {
      const fornecedorValidation = validateTextInput(novaDespesa.fornecedor, 255);
      if (!fornecedorValidation.isValid) {
        errors.fornecedor = fornecedorValidation.error!;
      }
    }

    // Validar valor
    const valorValidation = validateNumericInput(novaDespesa.valor, 0.01, 999999999);
    if (!valorValidation.isValid) {
      errors.valor = valorValidation.error!;
    }

    // Validar forma de pagamento
    if (!novaDespesa.formaPagamento) {
      errors.formaPagamento = 'Forma de pagamento é obrigatória';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const despesaData = {
      data: novaDespesa.data,
      descricao: sanitizeText(novaDespesa.descricao),
      categoria: novaDespesa.categoria,
      fornecedor: novaDespesa.fornecedor ? sanitizeText(novaDespesa.fornecedor) : '',
      valor: parseFloat(novaDespesa.valor),
      formaPagamento: novaDespesa.formaPagamento
    };

    addDespesa(despesaData);
    setNovaDespesa({
      data: '',
      descricao: '',
      categoria: '',
      fornecedor: '',
      valor: '',
      formaPagamento: ''
    });
    setValidationErrors({});
    setIsDialogOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Sanitize input to prevent XSS
    const sanitizedValue = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    setNovaDespesa(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleCategoriaChange = (value: string) => {
    handleInputChange('categoria', value);
  };

  const handleFormaPagamentoChange = (value: string) => {
    handleInputChange('formaPagamento', value);
  };

  const handleDeleteDespesa = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.')) {
      await deleteDespesa(id);
    }
  };

  const totalDespesas = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Despesas</h2>
          <p className="text-muted-foreground">Controle completo das suas saídas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Despesa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDespesa} className="space-y-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={novaDespesa.data}
                  onChange={(e) => handleInputChange('data', e.target.value)}
                  className={`rounded-xl ${validationErrors.data ? 'border-red-500' : ''}`}
                  max={new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                {validationErrors.data && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.data}</p>
                )}
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Descrição da despesa"
                  value={novaDespesa.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  className={`rounded-xl ${validationErrors.descricao ? 'border-red-500' : ''}`}
                  maxLength={255}
                  required
                />
                {validationErrors.descricao && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.descricao}</p>
                )}
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={novaDespesa.categoria} onValueChange={handleCategoriaChange}>
                  <SelectTrigger className={`rounded-xl ${validationErrors.categoria ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fornecedores">Fornecedores</SelectItem>
                    <SelectItem value="equipamentos">Equipamentos</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.categoria && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.categoria}</p>
                )}
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  placeholder="Nome do fornecedor (opcional)"
                  value={novaDespesa.fornecedor}
                  onChange={(e) => handleInputChange('fornecedor', e.target.value)}
                  className={`rounded-xl ${validationErrors.fornecedor ? 'border-red-500' : ''}`}
                  maxLength={255}
                />
                {validationErrors.fornecedor && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.fornecedor}</p>
                )}
              </div>
              <div>
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999999999"
                  placeholder="0,00"
                  value={novaDespesa.valor}
                  onChange={(e) => handleInputChange('valor', e.target.value)}
                  className={`rounded-xl ${validationErrors.valor ? 'border-red-500' : ''}`}
                  required
                />
                {validationErrors.valor && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.valor}</p>
                )}
              </div>
              <div>
                <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                <Select value={novaDespesa.formaPagamento} onValueChange={handleFormaPagamentoChange}>
                  <SelectTrigger className={`rounded-xl ${validationErrors.formaPagamento ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.formaPagamento && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.formaPagamento}</p>
                )}
              </div>
              <Button type="submit" className="w-full rounded-xl">
                Adicionar Despesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesa Total</p>
                <p className="text-2xl font-bold text-red-600">R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-red-600 text-2xl">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Transações</p>
                <p className="text-2xl font-bold">{despesas.length}</p>
              </div>
              <div className="text-blue-600 text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média por Transação</p>
                <p className="text-2xl font-bold">R$ {despesas.length > 0 ? (totalDespesas / despesas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
              <div className="text-purple-600 text-2xl">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Histórico de Despesas</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="rounded-lg">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {despesas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma despesa cadastrada</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando sua primeira despesa</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Despesa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>{despesa.data}</TableCell>
                    <TableCell>{despesa.descricao}</TableCell>
                    <TableCell>{despesa.categoria}</TableCell>
                    <TableCell>{despesa.fornecedor || '-'}</TableCell>
                    <TableCell>{despesa.formaPagamento}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      R$ {despesa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDespesa(despesa.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default Despesas;
