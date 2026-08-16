import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscribeLoading } from '@/lib/loading-overlay';

/**
 * Full-screen overlay shown for the duration of any action wired into the global
 * loading counter (see lib/loading-overlay.ts) — Inertia visits and postJson() calls.
 */
export function LoadingOverlay() {
    const [active, setActive] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => subscribeLoading(setActive), []);

    useEffect(() => {
        // Short delay before showing — avoids a flash of the overlay for actions that
        // resolve almost instantly. Hiding has no such delay.
        const timer = setTimeout(() => setVisible(active), active ? 150 : 0);

        return () => clearTimeout(timer);
    }, [active]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[color:var(--color-ink)]/35 backdrop-blur-[1px] duration-150 animate-in fade-in"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--color-surface)] px-5 py-4 shadow-elevated-lg">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[color:var(--color-sky-deep)]" />
                <span className="text-sm font-medium text-[color:var(--color-ink)]">Memuat...</span>
            </div>
        </div>
    );
}
