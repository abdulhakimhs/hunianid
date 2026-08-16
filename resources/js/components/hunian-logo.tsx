import { cn } from '@/lib/utils';

export default function HunianLogo({ className }: { className?: string }) {
    return (
        <span className={cn('font-display text-lg font-bold tracking-tight text-[color:var(--color-ink)]', className)}>
            Hunian
            <span className="text-[color:var(--color-sky-deep)]">ID</span>
        </span>
    );
}
