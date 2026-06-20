import React, { useState, useCallback } from 'react';
import { SectionTourTrigger } from '@/components/onboarding/SectionTourTrigger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, UserPlus, Mail, Phone, Edit, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { MembroEquipe } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Componente de formulário separado para evitar re-renders
interface FormFieldsProps {
  formData: {
    nome: string;
    email: string;
    telefone: string;
    cargo: string;
    salario: number;
    periodicidade: 'mensal' | 'semanal' | 'quinzenal';
    dataAdmissao: string;
  };
  onFormChange: (data: any) => void;
  isEdit?: boolean;
}

const FormFields = React.memo(({ formData, onFormChange, isEdit = false }: FormFieldsProps) => {
  const handleChange = useCallback((field: string, value: any) => {
    onFormChange({ ...formData, [field]: value });
  }, [formData, onFormChange]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-nome' : 'nome'}>Nome Completo *</Label>
        <Input
          id={isEdit ? 'edit-nome' : 'nome'}
          value={formData.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          placeholder="Nome do funcionário"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-email' : 'email'}>Email *</Label>
        <Input
          id={isEdit ? 'edit-email' : 'email'}
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="email@exemplo.com"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-telefone' : 'telefone'}>Telefone</Label>
        <Input
          id={isEdit ? 'edit-telefone' : 'telefone'}
          value={formData.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={isEdit ? 'edit-cargo' : 'cargo'}>Cargo *</Label>
        <Input
          id={isEdit ? 'edit-cargo' : 'cargo'}
          value={formData.cargo}
          onChange={(e) => handleChange('cargo', e.target.value)}
          placeholder="Ex: Assistente Contábil"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? 'edit-salario' : 'salario'}>Salário *</Label>
          <Input
            id={isEdit ? 'edit-salario' : 'salario'}
            type="number"
            value={formData.salario}
            onChange={(e) => handleChange('salario', Number(e.target.value))}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? 'edit-periodicidade' : 'periodicidade'}>Periodicidade</Label>
          <Select 
            value={formData.periodicidade} 
            onValueChange={(value: 'mensal' | 'semanal' | 'quinzenal') => handleChange('periodicidade', value)}
          >
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
        <Label htmlFor={isEdit ? 'edit-dataAdmissao' : 'dataAdmissao'}>Data de Admissão</Label>
        <Input
          id={isEdit ? 'edit-dataAdmissao' : 'dataAdmissao'}
          type="date"
          value={formData.dataAdmissao}
          onChange={(e) => handleChange('dataAdmissao', e.target.value)}
        />
      </div>
    </div>
  );
});

FormFields.displayName = 'FormFields';

const Equipe = () => {
  const { membrosEquipe, addMembroEquipe, updateMembroEquipe, deleteMembroEquipe } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MembroEquipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState<{[key: string]: boolean}>({});
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: '',
    salario: 0,
    periodicidade: 'mensal' as 'mensal' | 'semanal' | 'quinzenal',
    dataAdmissao: new Date().toISOString().split('T')[0]
  });

  // Função para mascarar dados sensíveis
  const maskSalary = (value: number) => 'R$ ***,***';
  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  };
  const maskPhone = (phone: string) => {
    return phone ? '***-***-' + phone.slice(-4) : '';
  };

  const toggleSensitiveData = (memberId: string) => {
    setShowSensitiveData(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

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
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novoMembro = {
      ...formData,
      status: 'ativo' as const
    };

    try {
      await addMembroEquipe(novoMembro);
      toast.success('Membro adicionado com sucesso!');
      resetForm();
      setIsAddDialogOpen(false);
    } catch {
      toast.error('Erro ao salvar membro', { description: 'Verifique sua conexão e tente novamente.' });
    }
  };

  const handleEdit = (member: MembroEquipe) => {
    setEditingMember(member);
    setFormData({
      nome: member.nome,
      email: member.email,
      telefone: member.telefone,
      cargo: member.cargo,
      salario: member.salario,
      periodicidade: member.periodicidade,
      dataAdmissao: member.dataAdmissao
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMember || !formData.nome || !formData.email || !formData.cargo || formData.salario <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await updateMembroEquipe(editingMember.id, {
        ...formData,
        status: 'ativo'
      });
      toast.success('Membro atualizado com sucesso!');
      setEditingMember(null);
      resetForm();
      setIsEditDialogOpen(false);
    } catch {
      toast.error('Erro ao atualizar membro.');
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteMembroEquipe(deletingId);
        toast.success('Membro removido com sucesso!');
      } catch {
        toast.error('Erro ao remover membro.');
      }
      setDeletingId(null);
    }
  };

  const calcularCustoTotal = () => {
    return membrosEquipe.reduce((total, membro) => {
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

  const handleFormChange = useCallback((newData: any) => {
    setFormData(newData);
  }, []);

  return (
    <section className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-1"><h2 className="text-2xl sm:text-3xl font-bold text-foreground font-display tracking-tight">Gestão de Equipe</h2><SectionTourTrigger tourId="equipe" /></div>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe com segurança e controle de acesso</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl" data-tutorial="add-membro-btn">
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Membro</DialogTitle>
              <DialogDescription>
                Adicione um novo membro à sua equipe com informações completas e configurações de acesso.
              </DialogDescription>
            </DialogHeader>
            <FormFields formData={formData} onFormChange={handleFormChange} />
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                Adicionar
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Membros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {membrosEquipe.map((membro) => (
          <Card key={membro.id} className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{membro.nome}</h3>
                    <p className="text-sm text-muted-foreground">{membro.cargo}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSensitiveData(membro.id)}
                    title={showSensitiveData[membro.id] ? "Ocultar dados sensíveis" : "Mostrar dados sensíveis"}
                  >
                    {showSensitiveData[membro.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(membro)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(membro.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {showSensitiveData[membro.id] ? membro.email : maskEmail(membro.email)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {showSensitiveData[membro.id] ? membro.telefone : maskPhone(membro.telefone)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Salário ({membro.periodicidade})</span>
                  </div>
                  <Badge variant={showSensitiveData[membro.id] ? "default" : "secondary"} className="text-xs">
                    {showSensitiveData[membro.id] ? "Visível" : "Protegido"}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="font-bold text-success">
                    {showSensitiveData[membro.id] 
                      ? `R$ ${membro.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : maskSalary(membro.salario)
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    membro.status === 'ativo' ? 'bg-success/10 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-destructive/10 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {membro.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Desde {new Date(membro.dataAdmissao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Card para adicionar novo membro */}
        <Card className="rounded-2xl shadow-sm border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent 
            className="p-6 flex flex-col items-center justify-center h-full min-h-[280px] cursor-pointer"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Adicionar Membro</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Convide novos membros para sua equipe financeira
            </p>
            <Button variant="outline" className="rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas da Equipe */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Estatísticas da Equipe</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-primary/10 rounded-xl">
              <p className="text-3xl font-bold text-primary">{membrosEquipe.filter(m => m.status === 'ativo').length}</p>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-xl">
              <p className="text-3xl font-bold text-success">
                R$ {calcularCustoTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">Custo Mensal Total</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-3xl font-bold text-purple-600">
                {membrosEquipe.length > 0 ? '100%' : '0%'}
              </p>
              <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-xl">
              <p className="text-3xl font-bold text-warning">
                {membrosEquipe.length}
              </p>
              <p className="text-sm text-muted-foreground">Total de Membros</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Membro da Equipe</DialogTitle>
            <DialogDescription>
              Edite as informações do membro da equipe. Todos os dados serão atualizados no sistema.
            </DialogDescription>
          </DialogHeader>
          <FormFields formData={formData} onFormChange={handleFormChange} isEdit={true} />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleUpdate} className="flex-1">
              Salvar Alterações
            </Button>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os dados do membro serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Equipe;