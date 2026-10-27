import { useEffect } from 'react';

export type PanicAlertPushPayload = {
    title: string;
    body: string;
    data: {
        url?: string;
        alertId: number;
        unit: string;
        tenantName: string;
        triggeredAt: number;
    };
};

/**
 * Foreground-only: when the service worker's `push` handler finds an already-
 * focused window, it postMessages the payload here instead of (or as well as)
 * showing an OS notification, so an open security dashboard can trigger the
 * siren overlay instantly. A backgrounded/closed tab only gets the OS
 * notification (see resources/js/sw.ts) — tapping it lands back on /security,
 * but without replaying this listener's callback.
 */
export function usePanicAlertListener(
    onAlert: (payload: PanicAlertPushPayload) => void,
) {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        function handler(event: MessageEvent) {
            if (event.data?.type === 'panic-alert') {
                onAlert(event.data.payload as PanicAlertPushPayload);
            }
        }

        navigator.serviceWorker.addEventListener('message', handler);

        return () =>
            navigator.serviceWorker.removeEventListener('message', handler);
    }, [onAlert]);
}
