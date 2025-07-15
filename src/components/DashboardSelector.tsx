import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building, User, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useSubscription } from '@/components/SubscriptionStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const DashboardSelector = () => {
  const { currentDashboard, dashboards, setCurrentDashboard, createDashboard, deleteDashboard } = useDashboard();
  const { subscriptionTier } = useSubscription();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardType, setNewDashboardType] = useState<'personal' | 'business'>('business');

  const canCreateDashboard = () => {
    if (subscriptionTier === 'premium' || subscriptionTier === 'enterprise') {
      return dashboards.length < 5;
    }
    return false;
  };

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    try {
      await createDashboard(newDashboardName, newDashboardType);
      setIsCreateDialogOpen(false);
      setNewDashboardName('');
      setNewDashboardType('business');
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    if (dashboards.length <= 1) return; // Não permitir deletar o último dashboard
    
    try {
      await deleteDashboard(id);
    } catch (error) {
      console.error('Error deleting dashboard:', error);
    }
  };

  if (!currentDashboard) return null;

  return (
    <div className="relative">
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                {currentDashboard.type === 'business' ? (
                  <Building className="h-5 w-5 text-primary-foreground" />
                ) : (
                  <User className="h-5 w-5 text-primary-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{currentDashboard.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant={currentDashboard.type === 'business' ? 'default' : 'secondary'}>
                    {currentDashboard.type === 'business' ? 'Empresarial' : 'Pessoal'}
                  </Badge>
                  {currentDashboard.isDefault && (
                    <Badge variant="outline">Padrão</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Dashboard Dropdown */}
              {dashboards.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="relative"
                >
                  Trocar Dashboard
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              )}

              {/* Create Dashboard Button */}
              {canCreateDashboard() && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Novo Dashboard
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Dashboard</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Dashboard</Label>
                        <Input
                          id="name"
                          value={newDashboardName}
                          onChange={(e) => setNewDashboardName(e.target.value)}
                          placeholder="Ex: Empresa X, Freelances, Pessoal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={newDashboardType} onValueChange={(value: 'personal' | 'business') => setNewDashboardType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">Empresarial</SelectItem>
                            <SelectItem value="personal">Pessoal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCreateDashboard} disabled={!newDashboardName.trim()}>
                          Criar Dashboard
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Dashboard Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50">
              <div className="p-2 space-y-1">
                {dashboards.map((dashboard) => (
                  <div key={dashboard.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                    <button
                      onClick={() => {
                        setCurrentDashboard(dashboard);
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {dashboard.type === 'business' ? (
                        <Building className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="font-medium">{dashboard.name}</span>
                      {dashboard.isDefault && (
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      )}
                    </button>
                    {dashboards.length > 1 && !dashboard.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDashboard(dashboard.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Notice for Free/Plus Users */}
      {!canCreateDashboard() && (subscriptionTier === 'free' || subscriptionTier === 'plus') && (
        <Alert className="mt-4">
          <AlertDescription>
            <strong>Multi-Dashboard</strong> está disponível apenas no plano Premium. 
            Atualize para gerenciar até 5 dashboards separados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};