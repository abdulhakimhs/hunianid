let loadPromise: Promise<typeof google> | null = null;

/**
 * Loads the Google Maps JS API and the `places` library exactly once, no matter how many
 * components ask for it. Reuses `window.google` if it's already present (e.g. hot reload).
 *
 * Uses the classic `callback=` query param rather than `loading=async` + `importLibrary` —
 * `importLibrary` only exists if you embed Google's special inline bootstrap snippet, which
 * a plain `<script src>` doesn't give you. `callback` is well-worn and only fires once the
 * script AND every requested library are fully ready, so there's no readiness race to get wrong.
 */
export function loadGoogleMaps(): Promise<typeof google> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Google Maps can only load in the browser.'));
    }

    if (window.google?.maps?.places) {
        return Promise.resolve(window.google);
    }

    if (loadPromise) {
        return loadPromise;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

    if (!apiKey) {
        return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set.'));
    }

    loadPromise = new Promise((resolve, reject) => {
        const fail = (error: Error) => {
            // Don't let a transient failure permanently wedge every future call — let the
            // next caller try again from scratch.
            loadPromise = null;
            console.error('[google-maps]', error.message);
            reject(error);
        };

        const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps]');

        if (existing) {
            // Someone else already kicked off the load; there's no callback to re-attach to,
            // so just poll briefly until it's ready.
            const startedAt = Date.now();
            const check = () => {
                if (window.google?.maps?.places) {
                    resolve(window.google);
                } else if (Date.now() - startedAt > 10000) {
                    fail(new Error('Timed out waiting for an in-flight Google Maps load.'));
                } else {
                    setTimeout(check, 50);
                }
            };
            check();

            return;
        }

        const callbackName = `__googleMapsCallback_${Date.now()}`;

        (window as unknown as Record<string, () => void>)[callbackName] = () => {
            delete (window as unknown as Record<string, unknown>)[callbackName];

            if (window.google?.maps?.places) {
                resolve(window.google);
            } else {
                fail(new Error('Google Maps callback fired but google.maps.places is still missing.'));
            }
        };

        const script = document.createElement('script');
        script.dataset.googleMaps = 'true';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        script.addEventListener('error', () => fail(new Error(`Failed to load Google Maps script from ${script.src}. Check network/CSP/ad-blocker.`)), { once: true });
        document.head.appendChild(script);
    });

    return loadPromise;
}
