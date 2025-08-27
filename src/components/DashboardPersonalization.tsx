import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building, User, Save, Edit3, X } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileData {
  user_type: string;
  nome_preferido: string;
  subscription_tier: string;
}

export const DashboardPersonalization: React.FC = () => {
  const { dashboards, currentDashboard, updateDashboardName } = useDashboard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [userProfileData, setUserProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const mainDashboard = dashboards.find(d => d.isDefault);

  useEffect(() => {
    if (user && mainDashboard) {
      loadUserProfileData();
    }
  }, [user, mainDashboard]);

  const loadUserProfileData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_profile_data', { user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setUserProfileData(data[0]);
        
        // Se o dashboard principal ainda tem nome genérico, sugerir personalização
        if (mainDashboard && (
          mainDashboard.name === 'Dashboard Principal' || 
          mainDashboard.name.includes('Dashboard')
        )) {
          const userData = data[0];
          const suggestedName = userData.user_type === 'empresarial' 
            ? `${userData.nome_preferido} - Empresa`
            : `${userData.nome_preferido} - Pessoal`;
          setNewName(suggestedName);
        } else {
          setNewName(mainDashboard?.name || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mainDashboard || !newName.trim()) return;

    try {
      await updateDashboardName(mainDashboard.id, newName.trim());
      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Nome do dashboard principal atualizado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar nome do dashboard.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setNewName(mainDashboard?.name || '');
    setIsEditing(false);
  };

  if (loading || !mainDashboard || !userProfileData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {userProfileData.user_type === 'empresarial' ? (
            <Building className="h-5 w-5" />
          ) : (
            <User className="h-5 w-5" />
          )}
          Dashboard Principal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="default">Principal</Badge>
          <Badge variant="outline">
            {userProfileData.user_type === 'empresarial' ? 'Empresarial' : 'Pessoal'}
          </Badge>
          <Badge variant="secondary">
            {userProfileData.subscription_tier === 'free' ? 'Gratuito' : 
             userProfileData.subscription_tier.charAt(0).toUpperCase() + userProfileData.subscription_tier.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3">
          <Label>Nome do Dashboard</Label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  userProfileData.user_type === 'empresarial' 
                    ? "Nome da sua empresa" 
                    : "Seu nome ou apelido"
                }
                className="flex-1"
              />
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <span className="font-medium">{mainDashboard.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="mb-1">
            <strong>Tipo de conta:</strong> {userProfileData.user_type === 'empresarial' ? 'Empresarial' : 'Pessoal'}
          </p>
          <p>
            Este é seu dashboard principal e não pode ser excluído. Personalize o nome para refletir {
              userProfileData.user_type === 'empresarial' ? 'sua empresa' : 'seu uso pessoal'
            }.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};