import { createInertiaApp, router } from '@inertiajs/react';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { beginLoading, endLoading } from '@/lib/loading-overlay';
import { initServiceWorker } from './lib/register-sw';

// Drives the global loading overlay — only for GET page navigations. Hover-triggered
// prefetches (sidebar links use `prefetch`) fire these too, so skip those; and skip
// non-GET (form submit/save/delete) visits since their triggering button already
// shows its own inline spinner — a second full-screen overlay would be redundant.
router.on('start', (event) => {
    const { visit } = event.detail;

    if (!visit.prefetch && visit.method === 'get') {
        beginLoading();
    }
});
router.on('finish', (event) => {
    const { visit } = event.detail;

    if (!visit.prefetch && visit.method === 'get') {
        endLoading();
    }
});

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
            case name.startsWith('visitor-pass/'):
                return AuthLayout;
            // Security pages (dashboard/scan/history/profile) each build their own
            // full-height mobile app shell — wrapping them in AuthLayout's centered,
            // max-w-md login card squeezed the whole screen into a small padded box.
            case name.startsWith('security/'):
            case name.startsWith('tenant/'):
                return null;
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

initServiceWorker();

// This will set light / dark mode on load...
initializeTheme();
