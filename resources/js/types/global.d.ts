import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}

declare global {
    // Not part of lib.dom.d.ts — used by the PWA "Install App" prompt.
    interface BeforeInstallPromptEvent extends Event {
        prompt(): Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    }
}
