import * as React from 'react';
import { Input } from '@/components/ui/input';

function formatDigits(digits: string) {
    if (!digits) {
        return '';
    }

    return new Intl.NumberFormat('id-ID').format(Number(digits));
}

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
    value: string;
    onValueChange: (rawValue: string) => void;
};

/**
 * Rupiah input: shows a thousands-separated "Rp 750.000" display while the
 * value passed to onValueChange is always the plain numeric string ("750000"),
 * which is what the backend amount columns expect.
 */
function CurrencyInput({ value, onValueChange, placeholder, ...props }: CurrencyInputProps) {
    const digits = value.replace(/\D/g, '');

    return (
        <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-(--color-ink)/40">
                Rp
            </span>
            <Input
                {...props}
                inputMode="numeric"
                value={formatDigits(digits)}
                placeholder={placeholder ?? '750.000'}
                onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ''))}
                className={`pl-9 ${props.className ?? ''}`}
            />
        </div>
    );
}

export { CurrencyInput };
