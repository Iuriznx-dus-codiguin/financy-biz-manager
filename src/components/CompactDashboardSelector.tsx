import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building, User, Plus, ChevronDown, Briefcase } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { DashboardCreateDialog } from '@/components/DashboardCreateDialog';

export const CompactDashboardSelector = () => {
  const { currentDashboard, dashboards, setCurrentDashboard } = useDashboard();
  const { isFeatureAvailable, getLimits } = useFeatureAccess();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const limits = getLimits();
  const { subscriptionTier } = useFeatureAccess();

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
                  <div className="flex-1 text-left flex items-center gap-2">
                    <span>{dashboard.name}</span>
                    {dashboard.isDefault && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  </div>
                  {currentDashboard?.id === dashboard.id && <Badge variant="outline" className="text-xs ml-auto">Atual</Badge>}
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
                  <div className="flex-1 text-left flex items-center gap-2">
                    <span>{dashboard.name}</span>
                    {dashboard.isDefault && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  </div>
                  {currentDashboard?.id === dashboard.id && <Badge variant="outline" className="text-xs ml-auto">Atual</Badge>}
                </button>
              ))}
            </div>
          )}

          {/* Create New Dashboard */}
          <>
            <DropdownMenuSeparator />
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors text-primary"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Dashboard</span>
            </button>
          </>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dashboard Create Dialog */}
      <DashboardCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
};