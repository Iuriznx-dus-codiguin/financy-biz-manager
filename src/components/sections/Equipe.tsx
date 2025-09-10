import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Mail, Phone, Edit, Trash2, Shield, Eye, PenTool } from 'lucide-react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { FeatureGate } from '@/components/EnhancedFeatureAccess';
import { LoadingStats, LoadingList } from '@/components/LoadingStates';

interface TeamMember {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cargo: string;
  salario: number;
  periodicidade: string;
  data_admissao: string;
  status: string;
}

const Equipe = () => {
  const { members, loading, stats, addMember, updateMember, deleteMember } = useTeamManagement();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    salario: 0,
    periodicidade: 'mensal' as string,
    dataAdmissao: new Date().toISOString().split('T')[0]
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      salario: 0,
    periodicidade: 'mensal',
      dataAdmissao: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.email || !formData.cargo || formData.salario <= 0) {
      return;
    }

    const novoMembro = {
      ...formData,
      data_admissao: formData.dataAdmissao,
      permissoes: {},
      status: 'ativo' as const
    };

    await addMember(novoMembro);
    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormData({
      nome: member.nome,
      email: member.email,
      telefone: member.telefone,
      cargo: member.cargo,
      salario: member.salario,
      periodicidade: member.periodicidade,
      dataAdmissao: member.data_admissao
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMember || !formData.nome || !formData.email || !formData.cargo || formData.salario <= 0) {
      return;
    }

    await updateMember(editingMember.id, {
      ...formData,
      status: 'ativo'
    });
    
    setEditingMember(null);
    resetForm();
    setIsEditDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este membro da equipe?')) {
      await deleteMember(id);
    }
  };

  const calcularCustoTotal = () => {
    return members.reduce((total, membro) => {
      if (membro.status === 'ativo') {
        switch (membro.periodicidade) {
          case 'mensal':
            return total + membro.salario;
          case 'semanal':
            return total + (membro.salario * 4);
          case 'quinzenal':
            return total + (membro.salario * 2);
          default:
            return total;
        }
      }
      return total;
    }, 0);
  };

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Equipe</h2>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe financeira</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Membro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do funcionário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  placeholder="Ex: Assistente Contábil"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salario">Salário</Label>
                  <Input
                    id="salario"
                    type="number"
                    value={formData.salario}
                    onChange={(e) => setFormData({ ...formData, salario: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodicidade">Periodicidade</Label>
                  <Select value={formData.periodicidade} onValueChange={(value: string) => setFormData({ ...formData, periodicidade: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                <Input
                  id="dataAdmissao"
                  type="date"
                  value={formData.dataAdmissao}
                  onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="flex-1">
                  Adicionar
                </Button>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((membro) => (
          <Card key={membro.id} className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{membro.nome}</h3>
                  <p className="text-sm text-muted-foreground">{membro.cargo}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(membro)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(membro.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{membro.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{membro.telefone}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Salário ({membro.periodicidade})</span>
                  <span className="font-bold text-green-600">
                    R$ {membro.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    membro.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {membro.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Desde {new Date(membro.data_admissao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Card para adicionar novo membro */}
        <Card className="rounded-2xl shadow-sm border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent 
            className="p-6 flex flex-col items-center justify-center h-full min-h-[200px] cursor-pointer"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Adicionar Membro</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Convide novos membros para sua equipe financeira
            </p>
            <Button className="rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Estatísticas da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{members.filter(m => m.status === 'ativo').length}</p>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-2xl font-bold text-green-600">
                R$ {calcularCustoTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">Custo Mensal Total</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">
                {members.length > 0 ? '100%' : '0%'}
              </p>
              <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome Completo</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do funcionário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cargo">Cargo</Label>
              <Input
                id="edit-cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ex: Assistente Contábil"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-salario">Salário</Label>
                <Input
                  id="edit-salario"
                  type="number"
                  value={formData.salario}
                  onChange={(e) => setFormData({ ...formData, salario: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-periodicidade">Periodicidade</Label>
                <Select value={formData.periodicidade} onValueChange={(value: string) => setFormData({ ...formData, periodicidade: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Equipe;
