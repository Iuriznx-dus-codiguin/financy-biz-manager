
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            size="lg"
            className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 transition-transform"
          >
            <span className="text-2xl font-bold">+</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Transação</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="receita" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="receita" className="rounded-lg">💰 Receita</TabsTrigger>
              <TabsTrigger value="despesa" className="rounded-lg">💸 Despesa</TabsTrigger>
            </TabsList>
            
            <TabsContent value="receita" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receita-desc">Descrição</Label>
                  <Input id="receita-desc" placeholder="Ex: Venda de produto" className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="receita-valor">Valor</Label>
                  <Input id="receita-valor" placeholder="R$ 0,00" className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receita-categoria">Categoria</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                      <SelectItem value="licencas">Licenças</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="receita-cliente">Cliente</Label>
                  <Input id="receita-cliente" placeholder="Nome do cliente" className="rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="receita-pagamento">Forma de Pagamento</Label>
                <Select>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full rounded-xl bg-green-600 hover:bg-green-700">
                💰 Adicionar Receita
              </Button>
            </TabsContent>
            
            <TabsContent value="despesa" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="despesa-desc">Descrição</Label>
                  <Input id="despesa-desc" placeholder="Ex: Pagamento fornecedor" className="rounded-xl" />
                </div>
                <div>
                  <Label htmlFor="despesa-valor">Valor</Label>
                  <Input id="despesa-valor" placeholder="R$ 0,00" className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="despesa-categoria">Categoria</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fornecedores">Fornecedores</SelectItem>
                      <SelectItem value="utilidades">Utilidades</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="despesa-status">Status</Label>
                  <Select>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="aberto">Em aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="despesa-vencimento">Data de Vencimento</Label>
                <Input id="despesa-vencimento" type="date" className="rounded-xl" />
              </div>
              <Button className="w-full rounded-xl bg-red-600 hover:bg-red-700">
                💸 Adicionar Despesa
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FloatingActionButton;
