
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

interface TimeFilterProps {
  value: string;
  onChange: (value: string) => void;
  showIcon?: boolean;
}

export const TimeFilter: React.FC<TimeFilterProps> = ({ value, onChange, showIcon = true }) => {
  return (
    <div className="flex items-center gap-2">
      {showIcon && <Clock className="h-4 w-4 text-muted-foreground" />}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-32 rounded-xl">
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
