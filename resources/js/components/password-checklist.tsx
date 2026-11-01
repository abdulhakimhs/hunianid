import { Check } from 'lucide-react';
import { passwordPolicyChecks, type PasswordPolicy } from '@/lib/password-policy';

export default function PasswordChecklist({ password, policy }: { password: string; policy: PasswordPolicy }) {
    const checks = passwordPolicyChecks(password, policy);

    const items: Array<{ key: keyof typeof checks; label: string }> = [
        { key: 'minLength', label: `Minimal ${policy.minLength} karakter` },
        ...(policy.requireUpper ? [{ key: 'upper' as const, label: 'Ada huruf besar' }] : []),
        ...(policy.requireLower ? [{ key: 'lower' as const, label: 'Ada huruf kecil' }] : []),
        ...(policy.requireNumber ? [{ key: 'number' as const, label: 'Ada angka' }] : []),
        ...(policy.requireSymbol ? [{ key: 'symbol' as const, label: 'Ada simbol (!@#$...)' }] : []),
    ];

    return (
        <ul className="grid grid-cols-2 gap-1">
            {items.map((item) => (
                <li
                    key={item.key}
                    className={`flex items-center gap-1.5 text-xs ${
                        checks[item.key] ? 'text-[color:var(--color-mint-deep)]' : 'text-[color:var(--color-ink)]/45'
                    }`}
                >
                    <Check className={`h-3.5 w-3.5 shrink-0 ${checks[item.key] ? 'opacity-100' : 'opacity-30'}`} />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}
