import { useEffect, useState } from 'react';

export function useInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        function onBeforeInstallPrompt(e: Event) {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
        }

        function onAppInstalled() {
            setInstalled(true);
            setDeferred(null);
        }

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    async function promptInstall(): Promise<boolean> {
        if (!deferred) {
            return false;
        }

        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        setDeferred(null);

        return outcome === 'accepted';
    }

    return { canInstall: !!deferred, installed, promptInstall };
}
