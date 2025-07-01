
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

const Receitas = () => {
  const { receitas, addReceita, deleteReceita } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [novaReceita, setNovaReceita] = useState({
    data: '',
    descricao: '',
    categoria: '',
    cliente: '',
    valor: '',
    formaPagamento: ''
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validar data
    const dateValidation = validateDate(novaReceita.data);
    if (!dateValidation.isValid) {
      errors.data = dateValidation.error!;
    }

    // Validar descrição
    const descricaoValidation = validateTextInput(novaReceita.descricao, 255);
    if (!descricaoValidation.isValid) {
      errors.descricao = descricaoValidation.error!;
    }

    // Validar categoria
    if (!novaReceita.categoria) {
      errors.categoria = 'Categoria é obrigatória';
    }

    // Validar cliente (opcional, mas se preenchido deve ser válido)
    if (novaReceita.cliente) {
      const clienteValidation = validateTextInput(novaReceita.cliente, 255);
      if (!clienteValidation.isValid) {
        errors.cliente = clienteValidation.error!;
      }
    }

    // Validar valor
    const valorValidation = validateNumericInput(novaReceita.valor, 0.01, 999999999);
    if (!valorValidation.isValid) {
      errors.valor = valorValidation.error!;
    }

    // Validar forma de pagamento
    if (!novaReceita.formaPagamento) {
      errors.formaPagamento = 'Forma de pagamento é obrigatória';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddReceita = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const receitaData = {
      data: novaReceita.data,
      descricao: sanitizeText(novaReceita.descricao),
      categoria: novaReceita.categoria,
      cliente: novaReceita.cliente ? sanitizeText(novaReceita.cliente) : '',
      valor: parseFloat(novaReceita.valor),
      formaPagamento: novaReceita.formaPagamento
    };

    addReceita(receitaData);
    setNovaReceita({
      data: '',
      descricao: '',
      categoria: '',
      cliente: '',
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
    
    setNovaReceita(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleCategoriaChange = (value: string) => {
    handleInputChange('categoria', value);
  };

  const handleFormaPagamentoChange = (value: string) => {
    handleInputChange('formaPagamento', value);
  };

  const handleDeleteReceita = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.')) {
      await deleteReceita(id);
    }
  };

  const totalReceitas = receitas.reduce((sum, receita) => sum + receita.valor, 0);

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Receitas</h2>
          <p className="text-muted-foreground">Controle completo das suas entradas de dinheiro</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Receita</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddReceita} className="space-y-4">
              <div>
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={novaReceita.data}
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
                  placeholder="Descrição da receita"
                  value={novaReceita.descricao}
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
                <Select value={novaReceita.categoria} onValueChange={handleCategoriaChange}>
                  <SelectTrigger className={`rounded-xl ${validationErrors.categoria ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.categoria && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.categoria}</p>
                )}
              </div>
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  placeholder="Nome do cliente (opcional)"
                  value={novaReceita.cliente}
                  onChange={(e) => handleInputChange('cliente', e.target.value)}
                  className={`rounded-xl ${validationErrors.cliente ? 'border-red-500' : ''}`}
                  maxLength={255}
                />
                {validationErrors.cliente && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.cliente}</p>
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
                  value={novaReceita.valor}
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
                <Select value={novaReceita.formaPagamento} onValueChange={handleFormaPagamentoChange}>
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
                Adicionar Receita
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
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-green-600">R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Transações</p>
                <p className="text-2xl font-bold">{receitas.length}</p>
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
                <p className="text-2xl font-bold">R$ {receitas.length > 0 ? (totalReceitas / receitas.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
              </div>
              <div className="text-purple-600 text-2xl">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Histórico de Receitas</CardTitle>
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
          {receitas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma receita cadastrada</h3>
              <p className="text-muted-foreground mb-4">Comece adicionando sua primeira receita</p>
              <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Receita
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map((receita) => (
                  <TableRow key={receita.id}>
                    <TableCell>{receita.data}</TableCell>
                    <TableCell>{receita.descricao}</TableCell>
                    <TableCell>{receita.categoria}</TableCell>
                    <TableCell>{receita.cliente || '-'}</TableCell>
                    <TableCell>{receita.formaPagamento}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      R$ {receita.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReceita(receita.id)}
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

export default Receitas;
