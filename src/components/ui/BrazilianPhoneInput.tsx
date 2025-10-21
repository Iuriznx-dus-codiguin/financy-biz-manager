/**
 * Componente de Input de Telefone Brasileiro
 * 
 * Focado exclusivamente em números brasileiros (+55)
 * Com validação em tempo real e feedback visual
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateAndNormalizePhone, formatPhoneForDisplay } from '@/utils/evolutionPhoneValidation';

interface BrazilianPhoneInputProps {
  value: string;
  onChange: (formatted: string, isValid: boolean, normalized: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
  showValidationFeedback?: boolean;
}

export const BrazilianPhoneInput: React.FC<BrazilianPhoneInputProps> = ({
  value,
  onChange,
  placeholder = 'Digite seu número',
  className,
  label,
  error: externalError,
  showValidationFeedback = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message?: string;
    variant?: 'success' | 'warning' | 'error';
  }>({ isValid: false });

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);

    // Validar apenas se houver conteúdo suficiente
    if (rawValue.trim().length < 5) {
      setValidationState({ isValid: false });
      onChange(rawValue, false, '');
      return;
    }

    // Executar validação
    const result = validateAndNormalizePhone(rawValue);
    
    // Atualizar estado de validação
    if (!result.isValid) {
      setValidationState({
        isValid: false,
        message: result.error,
        variant: 'error'
      });
      onChange(rawValue, false, '');
    } else {
      // Determinar variante baseado em correções e warnings
      let variant: 'success' | 'warning' = 'success';
      let message = '';
      
      if (result.warning) {
        variant = 'warning';
        message = result.warning;
      } else if (result.corrections.length > 0) {
        variant = 'warning';
        message = result.corrections.map(c => c.message).join(' • ');
      }
      
      setValidationState({
        isValid: true,
        message: message || 'Número válido',
        variant
      });
      
      onChange(rawValue, true, result.normalized!);
    }
  };

  const formatInputMask = (val: string): string => {
    // Aplicar máscara brasileira: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    const digits = val.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    
    // Remover +55 se houver
    const cleanDigits = digits.startsWith('55') ? digits.substring(2) : digits;
    
    if (cleanDigits.length <= 2) {
      return `(${cleanDigits}`;
    } else if (cleanDigits.length <= 7) {
      return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2)}`;
    } else if (cleanDigits.length <= 11) {
      const ddd = cleanDigits.slice(0, 2);
      const firstPart = cleanDigits.slice(2, cleanDigits.length <= 10 ? 6 : 7);
      const secondPart = cleanDigits.slice(cleanDigits.length <= 10 ? 6 : 7);
      return `(${ddd}) ${firstPart}${secondPart ? `-${secondPart}` : ''}`;
    }
    
    // Limitar a 11 dígitos
    return formatInputMask(cleanDigits.slice(0, 11));
  };

  const getValidationIcon = () => {
    if (!showValidationFeedback || inputValue.length < 5) return null;
    
    if (validationState.isValid) {
      return validationState.variant === 'warning' ? (
        <Info className="h-4 w-4 text-warning" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-success" />
      );
    }
    
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  };

  const getValidationColor = () => {
    if (!showValidationFeedback || inputValue.length < 5) return '';
    
    if (validationState.isValid) {
      return validationState.variant === 'warning' ? 'border-warning' : 'border-success';
    }
    
    return 'border-destructive';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Phone className="h-4 w-4" />
        </div>
        
        <Input
          type="tel"
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-10',
            getValidationColor(),
            externalError && 'border-destructive'
          )}
          maxLength={15}
        />
        
        {showValidationFeedback && inputValue.length >= 5 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {/* Mensagens de validação */}
      {showValidationFeedback && validationState.message && inputValue.length >= 5 && (
        <div className={cn(
          'flex items-start gap-2 text-xs rounded-md p-2',
          validationState.variant === 'error' && 'bg-destructive/10 text-destructive',
          validationState.variant === 'warning' && 'bg-warning/10 text-warning',
          validationState.variant === 'success' && 'bg-success/10 text-success'
        )}>
          <div className="mt-0.5">
            {validationState.variant === 'error' && <AlertCircle className="h-3 w-3" />}
            {validationState.variant === 'warning' && <Info className="h-3 w-3" />}
            {validationState.variant === 'success' && <CheckCircle2 className="h-3 w-3" />}
          </div>
          <p className="flex-1">{validationState.message}</p>
        </div>
      )}
      
      {externalError && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md p-2">
          <AlertCircle className="h-3 w-3 mt-0.5" />
          <p className="flex-1">{externalError}</p>
        </div>
      )}
      
      {/* Informação sobre o formato */}
      {!validationState.message && !externalError && inputValue.length === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Formato: (DD) 9XXXX-XXXX
        </p>
      )}
    </div>
  );
};
