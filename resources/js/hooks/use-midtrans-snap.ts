import { useEffect, useState } from 'react';

declare global {
    interface Window {
        snap?: {
            pay: (
                token: string,
                options?: { onSuccess?: () => void; onPending?: () => void },
            ) => void;
        };
    }
}

/**
 * Loads Midtrans's Snap.js script once per client key/mode and reports when
 * `window.snap` is ready to call. Shared by admin/billing/index.tsx and
 * dashboard.tsx — both let a pengelola pay for a plan, just from different
 * pages.
 */
export function useMidtransSnap(clientKey: string | null, mode: 'sandbox' | 'production') {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!clientKey) {
            return;
        }

        const script = document.createElement('script');
        script.src =
            mode === 'production'
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', clientKey);
        script.onload = () => setReady(true);
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [clientKey, mode]);

    return ready;
}

function xsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

export async function startPlanCheckout(planId: number, billingCycle: 'monthly' | 'yearly') {
    const response = await fetch('/admin/billing/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
    });

    return response.json();
}
