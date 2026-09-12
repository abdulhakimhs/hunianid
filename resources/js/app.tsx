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
