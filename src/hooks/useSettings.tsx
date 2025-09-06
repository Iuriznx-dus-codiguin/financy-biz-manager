import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTheme } from './useTheme';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserSettings {
  // Aparência
  tema: 'light' | 'dark' | 'system';
  moeda: 'BRL' | 'USD' | 'EUR';
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: UserSettings = {
  tema: 'system',
  moeda: 'BRL',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();

  // Carregar configurações do localStorage e Supabase
  useEffect(() => {
    loadSettings();
  }, [user]);

  // Sincronizar configurações com o tema atual
  useEffect(() => {
    if (settings.tema !== theme && !loading) {
      setSettings(prev => ({ ...prev, tema: theme }));
    }
  }, [theme, settings.tema, loading]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Carregar do localStorage primeiro (mais rápido) - TODO: Migrar para cookies HttpOnly
      const localSettings = localStorage.getItem('financy-settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        const mergedSettings = { ...defaultSettings, ...parsed };
        setSettings(mergedSettings);
        // Sincronizar tema
        if (mergedSettings.tema !== theme) {
          setTheme(mergedSettings.tema);
        }
      } else {
        // Se não há configurações locais, use o tema atual
        const initialSettings = { ...defaultSettings, tema: theme };
        setSettings(initialSettings);
      }

      // Se há usuário logado, carregar do Supabase também
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, settings')
          .eq('id', user.id)
          .single();

        if (profile && (profile as any).settings) {
          const remoteSettings = JSON.parse((profile as any).settings);
          const finalSettings = { ...defaultSettings, ...remoteSettings };
          setSettings(finalSettings);
          // Sincronizar com localStorage e tema
          localStorage.setItem('financy-settings', JSON.stringify(finalSettings));
          if (finalSettings.tema !== theme) {
            setTheme(finalSettings.tema);
          }
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

      // Se o tema foi alterado, atualizar no ThemeProvider também
      if (newSettings.tema && newSettings.tema !== theme) {
        setTheme(newSettings.tema);
      }

      // Salvar no localStorage - TODO: Migrar para cookies HttpOnly
      localStorage.setItem('financy-settings', JSON.stringify(updatedSettings));

      // Salvar no Supabase se há usuário logado
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            settings: JSON.stringify(updatedSettings),
          } as any);
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


  const value: SettingsContextType = {
    settings,
    updateSettings,
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
