import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  /** Tema realmente aplicado ao DOM (resolve 'system' para 'dark' ou 'light'). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Alterna entre claro e escuro com base no tema efetivo (1 clique). */
  toggleTheme: () => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'financy-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (typeof window !== 'undefined' && (localStorage.getItem(storageKey) as Theme)) || defaultTheme
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getSystemTheme() : theme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    const next: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    root.classList.remove('light', 'dark');
    root.classList.add(next);
    setResolvedTheme(next);
  }, [theme]);

  // Reagir a mudanças do tema do sistema quando o usuário está em 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = mq.matches ? 'dark' : 'light';
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(next);
      setResolvedTheme(next);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    // Sempre baseia no tema efetivo — assim o primeiro clique funciona mesmo
    // partindo de 'system'.
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeProviderState = { theme, resolvedTheme, setTheme, toggleTheme };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
