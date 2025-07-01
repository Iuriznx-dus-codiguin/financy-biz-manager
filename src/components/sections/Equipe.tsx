
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Mail, Phone } from 'lucide-react';

const Equipe = () => {
  const membrosEquipe = [
    {
      id: 1,
      nome: 'João Silva',
      cargo: 'Gerente Financeiro',
      email: 'joao@empresa.com',
      telefone: '(11) 99999-9999',
      status: 'Ativo'
    },
    {
      id: 2,
      nome: 'Maria Santos',
      cargo: 'Assistente Contábil',
      email: 'maria@empresa.com',
      telefone: '(11) 88888-8888',
      status: 'Ativo'
    }
  ];

  return (
    <section className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Equipe</h2>
          <p className="text-muted-foreground">Gerencie os membros da sua equipe financeira</p>
        </div>
        <Button className="rounded-xl">
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {membrosEquipe.map((membro) => (
          <Card key={membro.id} className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{membro.nome}</h3>
                  <p className="text-sm text-muted-foreground">{membro.cargo}</p>
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
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {membro.status}
                  </span>
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Card para adicionar novo membro */}
        <Card className="rounded-2xl shadow-sm border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
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
              <p className="text-2xl font-bold text-blue-600">{membrosEquipe.length}</p>
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-2xl font-bold text-green-600">2</p>
              <p className="text-sm text-muted-foreground">Departamentos</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">100%</p>
              <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Equipe;
