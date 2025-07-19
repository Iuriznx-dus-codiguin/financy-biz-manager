import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building, User, Plus, ChevronDown, Briefcase } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export const CompactDashboardSelector = () => {
  const { currentDashboard, dashboards, setCurrentDashboard, createDashboard } = useDashboard();
  const { isFeatureAvailable, getLimits } = useFeatureAccess();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardType, setNewDashboardType] = useState<'personal' | 'business'>('business');

  const limits = getLimits();
  const canCreateDashboard = isFeatureAvailable('multi_dashboard') && dashboards.length < limits.maxDashboards;

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

  const personalDashboards = dashboards.filter(d => d.type === 'personal');
  const businessDashboards = dashboards.filter(d => d.type === 'business');

  if (!currentDashboard) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-xs">
            <Briefcase className="h-3 w-3" />
            {currentDashboard.name}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          {/* Personal Dashboards */}
          {personalDashboards.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                PESSOAL
              </div>
              {personalDashboards.map((dashboard) => (
                <button
                  key={dashboard.id}
                  onClick={() => setCurrentDashboard(dashboard)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors ${
                    currentDashboard.id === dashboard.id ? 'bg-muted' : ''
                  }`}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{dashboard.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Business Dashboards */}
          {businessDashboards.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                EMPRESARIAL
              </div>
              {businessDashboards.map((dashboard) => (
                <button
                  key={dashboard.id}
                  onClick={() => setCurrentDashboard(dashboard)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors ${
                    currentDashboard.id === dashboard.id ? 'bg-muted' : ''
                  }`}
                >
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{dashboard.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Add Dashboard Option */}
          {canCreateDashboard && (
            <>
              <DropdownMenuSeparator />
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-primary"
              >
                <Plus className="h-4 w-4" />
                <span>+ Adicionar Dashboard</span>
              </button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Dashboard Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
    </>
  );
};