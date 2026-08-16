import { createInertiaApp, router } from '@inertiajs/react';
// @ts-expect-error -- virtual module injected by vite-plugin-pwa at build time
import { registerSW } from 'virtual:pwa-register';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { beginLoading, endLoading } from '@/lib/loading-overlay';

// Drives the global loading overlay for Inertia visits. 'start'/'finish' also fire for
// hover-triggered prefetches (sidebar links use `prefetch`), so skip those explicitly.
router.on('start', (event) => {
    if (!event.detail.visit.prefetch) {
        beginLoading();
    }
});
router.on('finish', (event) => {
    if (!event.detail.visit.prefetch) {
        endLoading();
    }
});

// Only register in production — under `npm run dev` a stale worker treats every dev
// reload as a "new version" and force-reloads the page in a loop.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    registerSW({ immediate: true });
}

const appName = import.meta.env.VITE_APP_NAME || 'HunianID';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'landing':
            case name.startsWith('errors/'):
                return null;
            case name.startsWith('auth/'):
            case name.startsWith('invite/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <LoadingOverlay />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
