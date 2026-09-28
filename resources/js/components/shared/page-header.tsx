import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'default' | 'tenant' | 'security';

type PageHeaderProps = {
    title: string;
    backHref?: string; // present -> shows back arrow; omit for root tab screens
    rightSlot?: ReactNode; // e.g. a notification bell, avatar, or action icon
    tone?: Tone; // 'tenant' and 'security' give each app a distinct header color
};

const toneStyles: Record<Tone, { bar: string; text: string; hover: string }> = {
    default: {
        bar: 'border-b border-(--color-ink)/8 bg-(--color-surface)/95 backdrop-blur-sm',
        text: 'text-(--color-ink)',
        hover: 'hover:bg-(--color-ink)/5',
    },
    tenant: {
        bar: 'bg-(--color-sky-deep)',
        text: 'text-white',
        hover: 'hover:bg-white/10',
    },
    security: {
        bar: 'bg-(--color-ink)',
        text: 'text-white',
        hover: 'hover:bg-white/10',
    },
};

export default function PageHeader({
    title,
    backHref,
    rightSlot,
    tone = 'default',
}: PageHeaderProps) {
    const styles = toneStyles[tone];

    return (
        <div
            className={`sticky top-0 z-10 flex h-14 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] ${styles.bar}`}
        >
            {backHref ? (
                <Link
                    href={backHref}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.text} ${styles.hover}`}
                    aria-label="Kembali"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            ) : null}

            <h1
                className={`flex-1 truncate text-base font-semibold ${styles.text}`}
            >
                {title}
            </h1>

            {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
    );
}
