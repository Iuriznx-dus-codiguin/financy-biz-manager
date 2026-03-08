import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useTheme } from './useTheme';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserSettings {
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

  useEffect(() => {
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (settings.tema !== theme && !loading) {
      setSettings(prev => ({ ...prev, tema: theme }));
    }
  }, [theme, settings.tema, loading]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const localSettings = localStorage.getItem('financy-settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        const mergedSettings = { ...defaultSettings, ...parsed };
        setSettings(mergedSettings);
        if (mergedSettings.tema !== theme) setTheme(mergedSettings.tema);
      } else {
        setSettings({ ...defaultSettings, tema: theme });
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.settings) {
          // settings é jsonb no Supabase - pode ser objeto diretamente
          const remoteSettings = typeof profile.settings === 'string' 
            ? JSON.parse(profile.settings) 
            : profile.settings;
          const finalSettings = { ...defaultSettings, ...remoteSettings };
          setSettings(finalSettings);
          localStorage.setItem('financy-settings', JSON.stringify(finalSettings));
          if (finalSettings.tema !== theme) setTheme(finalSettings.tema);
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

      if (newSettings.tema && newSettings.tema !== theme) {
        setTheme(newSettings.tema);
      }

      localStorage.setItem('financy-settings', JSON.stringify(updatedSettings));

      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            settings: updatedSettings as any, // jsonb aceita objeto diretamente
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

  const value: SettingsContextType = { settings, updateSettings, loading };

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

// Formatadores memoizados fora do hook para reuso
const formatters: Record<string, Intl.NumberFormat> = {};

function getFormatter(currency: 'BRL' | 'USD' | 'EUR'): Intl.NumberFormat {
  if (!formatters[currency]) {
    const localeMap = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE' };
    formatters[currency] = new Intl.NumberFormat(localeMap[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });
  }
  return formatters[currency];
}

const CURRENCY_SYMBOLS = { BRL: 'R$', USD: '$', EUR: '€' } as const;

export function useCurrency() {
  const { settings } = useSettings();
  
  const formatCurrency = (value: number) => getFormatter(settings.moeda).format(value);
  const getCurrencySymbol = () => CURRENCY_SYMBOLS[settings.moeda];
  
  return { formatCurrency, getCurrencySymbol, currency: settings.moeda };
}
