import { Link } from '@inertiajs/react';
import HunianLogo from '@/components/hunian-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[color:var(--color-bg)] p-6">
            <div className="w-full max-w-md">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col items-center gap-3">
                        <Link href={home()}>
                            <HunianLogo />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated sm:p-7">
                        {(title || description) && (
                            <div className="mb-6 space-y-1">
                                {title && <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">{title}</h1>}
                                {description && <p className="text-sm text-[color:var(--color-ink)]/55">{description}</p>}
                            </div>
                        )}

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
