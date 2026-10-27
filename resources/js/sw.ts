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
                const focused = clients.find(
                    (client) => (client as WindowClient).focused,
                );

                if (focused) {
                    focused.postMessage({ type: 'panic-alert', payload });

                    return;
                }

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

    const url = (event.notification.data as PanicAlertPushData | undefined)
        ?.url ?? '/security';

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
