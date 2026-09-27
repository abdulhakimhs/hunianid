import { useCallback, useEffect, useState } from 'react';

// Set by whoever generates the VAPID keypair on the backend (e.g. via
// `php artisan webpush:vapid` if using laravel-notification-channels/webpush).
// Add VITE_VAPID_PUBLIC_KEY=... to your .env once that exists.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
    string | undefined;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }

    return output;
}

export type PushStatus =
    'checking' | 'unsupported' | 'default' | 'denied' | 'subscribed';

export function usePushNotifications() {
    const [status, setStatus] = useState<PushStatus>('checking');
    const [loading, setLoading] = useState(false);

    async function checkExisting() {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (existing) {
            setStatus('subscribed');

            return;
        }

        setStatus(Notification.permission === 'denied' ? 'denied' : 'default');
    }

    useEffect(() => {
        const supported =
            'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window;

        if (!supported) {
            setStatus('unsupported');

            return;
        }

        checkExisting();
    }, []);

    const subscribe = useCallback(async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error(
                'VITE_VAPID_PUBLIC_KEY is not set — ask backend for the VAPID public key.',
            );

            return;
        }

        setLoading(true);

        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setStatus('denied');

                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Dummy send — swap for a real POST /push-subscriptions call,
            // storing subscription.toJSON() against the current user so the
            // backend can target this device later.
            console.log(
                'Push subscription to send to backend:',
                subscription.toJSON(),
            );

            setStatus('subscribed');
        } catch (error) {
            console.error('Push subscription failed:', error);
            setStatus('default');
        } finally {
            setLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();

            if (existing) {
                await existing.unsubscribe();

                // Dummy — swap for a real DELETE /push-subscriptions call.
            }

            setStatus('default');
        } finally {
            setLoading(false);
        }
    }, []);

    return { status, loading, subscribe, unsubscribe };
}
