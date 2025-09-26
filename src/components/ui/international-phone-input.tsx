import React, { useState, useEffect } from 'react';
import { parsePhoneNumber, AsYouType } from 'libphonenumber-js';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './command';
import { Check, ChevronsUpDown, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'BR', name: 'Brasil', callingCode: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', callingCode: '+1', flag: '🇺🇸' },
  { code: 'AR', name: 'Argentina', callingCode: '+54', flag: '🇦🇷' },
  { code: 'MX', name: 'México', callingCode: '+52', flag: '🇲🇽' },
  { code: 'CO', name: 'Colômbia', callingCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', callingCode: '+51', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', callingCode: '+56', flag: '🇨🇱' },
  { code: 'UY', name: 'Uruguai', callingCode: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', callingCode: '+595', flag: '🇵🇾' },
  { code: 'GB', name: 'Reino Unido', callingCode: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'França', callingCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemanha', callingCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Itália', callingCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Espanha', callingCode: '+34', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', callingCode: '+351', flag: '🇵🇹' },
  { code: 'CA', name: 'Canadá', callingCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrália', callingCode: '+61', flag: '🇦🇺' },
  { code: 'JP', name: 'Japão', callingCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'Índia', callingCode: '+91', flag: '🇮🇳' },
];

interface InternationalPhoneInputProps {
  value?: string;
  onChange: (value: string, isValid: boolean, e164: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value = '',
  onChange,
  placeholder,
  className,
  label,
  error
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Brasil como padrão
  const [phoneNumber, setPhoneNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Inicializar com o valor passado
  useEffect(() => {
    if (value && value !== phoneNumber) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed) {
          const country = countries.find(c => c.code === parsed.country);
          if (country) {
            setSelectedCountry(country);
          }
          setPhoneNumber(parsed.nationalNumber);
        }
      } catch (error) {
        // Se não conseguir fazer parse, usar o valor como está
        setPhoneNumber(value);
      }
    }
  }, [value]);

  const handlePhoneChange = (inputValue: string) => {
    setPhoneNumber(inputValue);
    
    try {
      // Usar AsYouType para formatação em tempo real
      const asYouType = new AsYouType(selectedCountry.code as any);
      asYouType.input(inputValue);
      const formatted = asYouType.getNumber()?.formatNational() || inputValue;
      
      // Tentar fazer parse completo para validação
      const fullNumber = selectedCountry.callingCode + inputValue.replace(/\D/g, '');
      const parsed = parsePhoneNumber(fullNumber);
      
      const valid = parsed?.isValid() || false;
      setIsValid(valid);
      
      // Retornar o número em formato E.164 se válido
      const e164 = valid && parsed ? parsed.number : fullNumber;
      
      onChange(formatted, valid, e164);
    } catch (error) {
      setIsValid(false);
      const e164 = selectedCountry.callingCode + inputValue.replace(/\D/g, '');
      onChange(inputValue, false, e164);
    }
  };

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    
    // Revalidar com o novo país
    if (phoneNumber) {
      handlePhoneChange(phoneNumber);
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    // Gerar placeholder baseado no país
    try {
      const asYouType = new AsYouType(selectedCountry.code as any);
      asYouType.input('1234567890');
      return asYouType.getNumber()?.formatNational() || '(11) 99999-9999';
    } catch {
      return '(11) 99999-9999';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <div className="flex gap-2">
        {/* Seletor de País */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-32 justify-between rounded-xl h-14 border-2 hover:border-green-500/50 transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedCountry.flag}</span>
                <span className="text-sm font-mono">{selectedCountry.callingCode}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Buscar país..." />
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.callingCode}`}
                    onSelect={() => handleCountryChange(country)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-base">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-sm font-mono text-muted-foreground">{country.callingCode}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Campo de Telefone */}
        <div className="flex-1 relative">
          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="tel"
            placeholder={getPlaceholder()}
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className={cn(
              'rounded-xl h-14 pl-12 pr-4 border-2 transition-all',
              isValid ? 'border-green-500' : 'focus:border-green-500',
              error && 'border-red-500'
            )}
          />
          {isValid && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Check className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {phoneNumber && !isValid && (
        <p className="text-sm text-amber-600">
          Verifique se o número está correto para {selectedCountry.name}
        </p>
      )}
    </div>
  );
};