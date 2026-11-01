/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

type PanicAlertPushData = {
    url?: string;
    alertId: number;
    unit: string;
    tenantName: string;
    triggeredAt: number;
};

type PushPayload = {
    title: string;
    body: string;
    data: PanicAlertPushData;
};

// lib.dom.d.ts doesn't know about the Notifications API's `vibrate` option
// (it's real, just missing from TS's built-in types) — extend it locally.
type NotificationOptionsWithVibrate = NotificationOptions & {
    vibrate?: number[];
};

self.addEventListener('push', (event: PushEvent) => {
    const payload = (event.data?.json() ?? {}) as PushPayload;

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Post to every open window, not just the one reported as
                // `.focused` — that flag is unreliable for installed/
                // standalone PWA windows on several Android/Chromium builds
                // and can report false while the app is genuinely on screen,
                // which silently dropped the in-app siren overlay. A window
                // that isn't listening just ignores the message.
                for (const client of clients) {
                    client.postMessage({ type: 'panic-alert', payload });
                }

                // Always show the OS notification too — a panic alert must
                // never depend on the dashboard specifically being the open
                // tab. postMessage above is a same-page bonus (instant siren
                // overlay), not a replacement for this.
                const options: NotificationOptionsWithVibrate = {
                    body: payload.body,
                    vibrate: [400, 200, 400, 200, 400],
                    requireInteraction: true,
                    data: payload.data,
                };

                return self.registration.showNotification(
                    payload.title,
                    options,
                );
            }),
    );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const data = event.notification.data as PanicAlertPushData | undefined;
    const base = data?.url ?? '/security';

    // Carry the alert along in the URL so opening from a backgrounded/closed
    // notification drops the guard straight into the ringing siren screen —
    // the data is already in the push payload, no extra API call needed.
    const url = data
        ? `${base}?panicAlertId=${data.alertId}&unit=${encodeURIComponent(data.unit)}&tenantName=${encodeURIComponent(data.tenantName)}&triggeredAt=${data.triggeredAt}`
        : base;

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            const existing = clients[0];

            if (existing) {
                return existing.focus();
            }

            return self.clients.openWindow(url);
        }),
    );
});
