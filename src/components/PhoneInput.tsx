import { Input } from '@/components/ui/input';
import type { ComponentProps } from 'react';

type PhoneInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'inputMode' | 'onChange' | 'value'> & {
  value: string;
  onChange: (digits: string) => void;
};

// Único lugar que decide como o telefone é digitado: sempre dígitos puros
// (nunca máscara tipo "(11) 99999-9999"), pra bater com phone_e164 salvo no
// banco sem precisar normalizar de novo no submit.
export function PhoneInput({ value, onChange, placeholder = '11999998888', ...props }: PhoneInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
      {...props}
    />
  );
}
