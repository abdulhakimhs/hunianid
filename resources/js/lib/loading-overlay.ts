/**
 * Tiny module-level pub/sub for a global "something is loading" flag. A counter, not a
 * boolean, since more than one thing can be in flight at once (e.g. a background fetch
 * plus an Inertia visit) — the overlay should only hide once everything has finished.
 *
 * Deliberately outside React state: this needs to be triggerable from plain functions
 * (postJson, Inertia's router event hooks in app.tsx) without those call sites needing
 * to live inside a component or thread a setter through props.
 */

type Listener = (active: boolean) => void;

let count = 0;
const listeners = new Set<Listener>();

function notify() {
    const active = count > 0;
    listeners.forEach((listener) => listener(active));
}

export function beginLoading() {
    count += 1;
    notify();
}

export function endLoading() {
    count = Math.max(0, count - 1);
    notify();
}

export function subscribeLoading(listener: Listener): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}
