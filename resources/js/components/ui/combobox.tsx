import { Check, ChevronsUpDown, Search } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export type ComboboxOption = { value: string; label: string };

type ComboboxProps = {
    options: ComboboxOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
};

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = 'Pilih...',
    searchPlaceholder = 'Cari...',
    emptyText = 'Tidak ditemukan.',
    className,
    disabled,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
        if (!open) {
            setQuery('');
        }
    }, [open]);

    const filtered = React.useMemo(() => {
        if (!query.trim()) {
            return options;
        }

        const q = query.toLowerCase();
        return options.filter((option) => option.label.toLowerCase().includes(q));
    }, [options, query]);

    const selected = options.find((option) => option.value === value);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-bg)] px-3.5 py-2 text-sm text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-sky)]/50 focus:ring-2 focus:ring-[color:var(--color-sky)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className={cn('truncate', !selected && 'text-[color:var(--color-ink)]/40')}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-surface)] shadow-elevated">
                    <div className="flex items-center gap-2 border-b border-[color:var(--color-ink)]/8 px-3 py-2">
                        <Search className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-ink)]/40" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink)]/40"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="px-3 py-4 text-center text-sm text-[color:var(--color-ink)]/40">{emptyText}</p>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5',
                                        option.value === value && 'bg-[color:var(--color-mint)]/8',
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'h-3.5 w-3.5 shrink-0 text-[color:var(--color-mint-deep)]',
                                            option.value === value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
