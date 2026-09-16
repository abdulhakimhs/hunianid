// resources/js/lib/register-sw.ts
import { registerSW } from 'virtual:pwa-register';

export function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        registerSW({
            immediate: true,
            onNeedRefresh() {
                // show your UpdateToast here
            },
            onOfflineReady() {
                console.log('App ready to work offline');
            },
        });
    }
}
