import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
  /** Quando definido, persiste o valor selecionado em localStorage por seção. */
  persistKey?: string;
}

const STORAGE_PREFIX = 'financy-filter:';

/** Carrega valor persistido de localStorage sem quebrar SSR/erros. */
export const loadPersistedTimeFilter = (persistKey: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + persistKey) || fallback;
  } catch {
    return fallback;
  }
};

export const TimeFilter: React.FC<TimeFilterProps> = ({ value, onChange, showIcon = true, persistKey }) => {
  // Persistência opcional: sincroniza com localStorage quando persistKey é fornecido.
  useEffect(() => {
    if (!persistKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + persistKey, value);
    } catch {
      /* ignore quota */
    }
  }, [persistKey, value]);

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {showIcon && <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
      <Select value={value} onValueChange={onChange} data-tutorial="time-filter">
        <SelectTrigger className="w-full sm:w-36 rounded-xl">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="ontem">Ontem</SelectItem>
          <SelectItem value="esta-semana">Esta Semana</SelectItem>
          <SelectItem value="semana-passada">Semana Passada</SelectItem>
          <SelectItem value="este-mes">Este Mês</SelectItem>
          <SelectItem value="mes-passado">Mês Passado</SelectItem>
          <SelectItem value="ultimos-30-dias">Últimos 30 Dias</SelectItem>
          <SelectItem value="ultimos-90-dias">Últimos 90 Dias</SelectItem>
          <SelectItem value="este-ano">Este Ano</SelectItem>
          <SelectItem value="ano-passado">Ano Passado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
