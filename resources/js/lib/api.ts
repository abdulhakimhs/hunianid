/**
 * Small JSON POST helper for calls that need a plain data round-trip rather than an
 * Inertia page visit.
 */

import { beginLoading, endLoading } from '@/lib/loading-overlay';

export class ApiValidationError extends Error {
    errors: Record<string, string>;

    constructor(errors: Record<string, string>) {
        super('Validation failed');
        this.name = 'ApiValidationError';
        this.errors = errors;
    }
}

type PostJsonOptions = {
    /** Show the global loading overlay for the duration of this call. Defaults to true. */
    showOverlay?: boolean;
};

export async function postJson<T>(url: string, body: unknown, options: PostJsonOptions = {}): Promise<T> {
    const { showOverlay = true } = options;

    const xsrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    if (showOverlay) {
        beginLoading();
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(xsrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken) } : {}),
            },
            body: JSON.stringify(body),
        });

        if (response.status === 422) {
            const data = await response.json().catch(() => ({}));

            throw new ApiValidationError(data.errors ?? {});
        }

        if (!response.ok) {
            throw new Error(`Request to ${url} failed with ${response.status}`);
        }

        return (await response.json()) as T;
    } finally {
        if (showOverlay) {
            endLoading();
        }
    }
}
