import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTheme } from './useTheme';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserSettings {
  // Aparência
  tema: 'light' | 'dark' | 'system';
  moeda: 'BRL' | 'USD' | 'EUR';
  idioma: 'pt-BR' | 'en-US' | 'es-ES';
  
  // Notificações
  notificacoes: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    relatorios: boolean;
  };
  
  // Dashboard
  dashboardPadrao: string | null;
  exibirAnimacoes: boolean;
  formatoData: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  
  // Privacidade
  perfilPublico: boolean;
  compartilharDados: boolean;
  
  // Backup automático
  backupAutomatico: boolean;
  frequenciaBackup: 'diario' | 'semanal' | 'mensal';
  
  // Preferências de relatório
  tipoGraficoFavorito: 'linha' | 'barra' | 'pizza' | 'rosca';
  cores: {
    receitas: string;
    despesas: string;
    impostos: string;
    metas: string;
  };
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (jsonSettings: string) => Promise<void>;
  loading: boolean;
}

const defaultSettings: UserSettings = {
  tema: 'system',
  moeda: 'BRL',
  idioma: 'pt-BR',
  notificacoes: {
    email: true,
    push: true,
    marketing: false,
    relatorios: true,
  },
  dashboardPadrao: null,
  exibirAnimacoes: true,
  formatoData: 'DD/MM/YYYY',
  perfilPublico: false,
  compartilharDados: false,
  backupAutomatico: true,
  frequenciaBackup: 'semanal',
  tipoGraficoFavorito: 'linha',
  cores: {
    receitas: '#22c55e',
    despesas: '#ef4444',
    impostos: '#f59e0b',
    metas: '#3b82f6',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar configurações do localStorage e Supabase
  useEffect(() => {
    loadSettings();
  }, [user]);

  // Sincronizar tema com o ThemeProvider
  useEffect(() => {
    setTheme(settings.tema);
  }, [settings.tema, setTheme]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Carregar do localStorage primeiro (mais rápido)
      const localSettings = localStorage.getItem('financy-settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }

      // Se há usuário logado, carregar do Supabase também
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile?.settings) {
          const remoteSettings = JSON.parse(profile.settings);
          setSettings({ ...defaultSettings, ...remoteSettings });
          // Sincronizar com localStorage
          localStorage.setItem('financy-settings', JSON.stringify(remoteSettings));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // Salvar no localStorage
      localStorage.setItem('financy-settings', JSON.stringify(updatedSettings));

      // Salvar no Supabase se há usuário logado
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            settings: JSON.stringify(updatedSettings),
          });
      }

      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive",
      });
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      localStorage.removeItem('financy-settings');

      if (user) {
        await supabase
          .from('profiles')
          .update({ settings: null })
          .eq('id', user.id);
      }

      toast({
        title: "Configurações resetadas",
        description: "Todas as configurações foram restauradas para o padrão.",
      });
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível resetar as configurações.",
        variant: "destructive",
      });
    }
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = async (jsonSettings: string) => {
    try {
      const importedSettings = JSON.parse(jsonSettings);
      await updateSettings(importedSettings);
      
      toast({
        title: "Configurações importadas",
        description: "Suas configurações foram importadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      toast({
        title: "Erro na importação",
        description: "Formato de arquivo inválido ou corrompido.",
        variant: "destructive",
      });
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    loading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Hook para formatação de moeda baseada nas configurações
export function useCurrency() {
  const { settings } = useSettings();
  
  const formatCurrency = (value: number) => {
    const formatters = {
      BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    };
    
    return formatters[settings.moeda].format(value);
  };
  
  const getCurrencySymbol = () => {
    const symbols = { BRL: 'R$', USD: '$', EUR: '€' };
    return symbols[settings.moeda];
  };
  
  return { formatCurrency, getCurrencySymbol, currency: settings.moeda };
}

// Hook para formatação de data baseada nas configurações
export function useDateFormat() {
  const { settings } = useSettings();
  
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    const formats = {
      'DD/MM/YYYY': `${day}/${month}/${year}`,
      'MM/DD/YYYY': `${month}/${day}/${year}`,
      'YYYY-MM-DD': `${year}-${month}-${day}`,
    };
    
    return formats[settings.formatoData];
  };
  
  return { formatDate, format: settings.formatoData };
}