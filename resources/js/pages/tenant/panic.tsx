import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    ChevronLeft,
    Flame,
    HeartPulse,
    Loader2,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_DURATION_MS = 2000;
const CANCEL_WINDOW_MS = 15000;

function now() {
    return performance.now();
}

function xsrfToken(): string {
    return decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
    );
}

// idle/holding: pre-send. pending: cancel countdown running, nothing sent
// yet. sending: the real request is in flight. sent: it succeeded — terminal.
// cancelled: the hold was aborted during the countdown, nothing was ever sent.
type Phase =
    'idle' | 'holding' | 'pending' | 'sending' | 'sent' | 'cancelled' | 'error';

const GENERIC_NETWORK_ERROR =
    'Sinyal darurat gagal terkirim. Periksa koneksi internet Anda dan coba lagi.';

type Reason = 'medical' | 'security' | 'fire' | 'other';

const reasonOptions: { key: Reason; label: string; icon: typeof HeartPulse }[] =
    [
        { key: 'medical', label: 'Medis', icon: HeartPulse },
        { key: 'security', label: 'Keamanan', icon: ShieldAlert },
        { key: 'fire', label: 'Kebakaran', icon: Flame },
        { key: 'other', label: 'Lainnya', icon: AlertOctagon },
    ];

export default function TenantPanic() {
    const [phase, setPhase] = useState<Phase>('idle');
    const [progress, setProgress] = useState(0);
    const [cancelSecondsLeft, setCancelSecondsLeft] = useState(0);
    const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
    const [errorMessage, setErrorMessage] = useState(GENERIC_NETWORK_ERROR);

    const holdStartRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    function startHold(e: React.PointerEvent<HTMLButtonElement>) {
        if (phase !== 'idle') {
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);

        setPhase('holding');
        // eslint-disable-next-line react-hooks/purity -- only runs inside this
        // pointerdown handler, never during render; safe despite the lint rule.
        holdStartRef.current = now();

        if (navigator.vibrate) {
            navigator.vibrate(20);
        }

        rafRef.current = requestAnimationFrame(tick);
    }

    function tick(now: number) {
        if (holdStartRef.current === null) {
            return;
        }

        const elapsed = now - holdStartRef.current;
        const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
        setProgress(pct);

        if (pct >= 100) {
            startPending();

            return;
        }

        rafRef.current = requestAnimationFrame(tick);
    }

    function cancelHold() {
        if (phase !== 'holding') {
            return;
        }

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        holdStartRef.current = null;
        setProgress(0);
        setPhase('idle');
    }

    // Hold-complete just starts the cancellable countdown — nothing is sent
    // to the backend yet, so a false trigger here costs nothing.
    function startPending() {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
        }

        setPhase('pending');
        setCancelSecondsLeft(CANCEL_WINDOW_MS / 1000);
    }

    const sendAlert = useCallback(async () => {
        setPhase('sending');

        try {
            const response = await fetch('/tenant/panic/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                },
                body: JSON.stringify({ reason: selectedReason }),
            });

            if (!response.ok) {
                // The request reached the server — this is a real validation
                // or server error, not a connectivity problem, so surface
                // whatever message the backend returned instead of the
                // generic "check your internet" copy.
                const body = await response.json().catch(() => null);

                setErrorMessage(
                    body?.message ||
                        `Sinyal darurat gagal terkirim (${response.status}). Coba lagi.`,
                );
                setPhase('error');

                return;
            }

            setPhase('sent');
        } catch {
            // fetch itself rejected (no response at all) — this is the one
            // case that's actually a connectivity issue.
            setErrorMessage(GENERIC_NETWORK_ERROR);
            setPhase('error');
        }
    }, [selectedReason]);

    function cancelFalseAlarm() {
        // Nothing was ever sent during the pending countdown, so cancelling
        // here is a true no-op — no backend call to undo.
        setPhase('cancelled');
    }

    function markReason(reason: Reason) {
        setSelectedReason(reason);
    }

    // Countdown for the cancel window — fires the real send once it hits 0.
    useEffect(() => {
        if (phase !== 'pending') {
            return;
        }

        if (cancelSecondsLeft <= 0) {
            // Deferred via setTimeout rather than called inline — sendAlert's
            // first line is a setState, and calling that synchronously inside
            // an effect body (rather than a timer/event callback) is what
            // react-hooks/set-state-in-effect warns against.
            const timer = setTimeout(sendAlert, 0);

            return () => clearTimeout(timer);
        }

        const timer = setTimeout(
            () => setCancelSecondsLeft((s) => s - 1),
            1000,
        );

        return () => clearTimeout(timer);
    }, [phase, cancelSecondsLeft, sendAlert]);

    return (
        <>
            <Head title="Panic Button" />

            <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col overflow-y-auto bg-(--color-surface) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                {(phase === 'idle' || phase === 'holding') && (
                    <IdleView
                        progress={progress}
                        phase={phase}
                        onHoldStart={startHold}
                        onHoldCancel={cancelHold}
                    />
                )}

                {phase === 'pending' && (
                    <PendingView
                        cancelSecondsLeft={cancelSecondsLeft}
                        selectedReason={selectedReason}
                        onSelectReason={markReason}
                        onCancelFalseAlarm={cancelFalseAlarm}
                    />
                )}

                {phase === 'sending' && <SendingView />}

                {phase === 'sent' && <SentView />}

                {phase === 'cancelled' && <CancelledView />}

                {phase === 'error' && (
                    <ErrorView
                        message={errorMessage}
                        onRetry={() => setPhase('idle')}
                    />
                )}
            </div>
        </>
    );
}

function IdleView({
    progress,
    phase,
    onHoldStart,
    onHoldCancel,
}: {
    progress: number;
    phase: Phase;
    onHoldStart: (e: React.PointerEvent<HTMLButtonElement>) => void;
    onHoldCancel: () => void;
}) {
    const radius = 88;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <>
            <div className="flex items-center px-4 pt-4">
                <Link
                    href="/tenant"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-(--color-ink)/50 hover:bg-(--color-ink)/5"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <p className="text-lg font-semibold text-(--color-ink)">
                    Tombol Darurat
                </p>
                <p className="mt-1 text-sm text-(--color-ink)/50">
                    Tahan tombol selama 2 detik untuk mengirim sinyal darurat ke
                    keamanan
                </p>

                <div className="relative mt-10 flex h-48 w-48 items-center justify-center">
                    <svg
                        className="pointer-events-none absolute h-full w-full -rotate-90"
                        viewBox="0 0 192 192"
                    >
                        <circle
                            cx="96"
                            cy="96"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-red-100"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="text-red-600 transition-[stroke-dashoffset] duration-75 ease-linear"
                        />
                    </svg>

                    <button
                        type="button"
                        onPointerDown={onHoldStart}
                        onPointerUp={onHoldCancel}
                        onPointerLeave={onHoldCancel}
                        className={`flex h-36 w-36 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 select-none ${
                            phase === 'holding' ? 'scale-95' : ''
                        } transition-transform`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <AlertOctagon className="h-9 w-9" />
                            <span className="text-xs font-semibold">
                                {phase === 'holding'
                                    ? 'Tahan...'
                                    : 'Tahan Tombol'}
                            </span>
                        </div>
                    </button>
                </div>

                <p className="mt-8 text-xs text-(--color-ink)/40">
                    Gunakan hanya dalam keadaan darurat sesungguhnya. Keamanan
                    di kompleks Anda akan diberi tahu.
                </p>
            </div>
        </>
    );
}

function PendingView({
    cancelSecondsLeft,
    selectedReason,
    onSelectReason,
    onCancelFalseAlarm,
}: {
    cancelSecondsLeft: number;
    selectedReason: Reason | null;
    onSelectReason: (reason: Reason) => void;
    onCancelFalseAlarm: () => void;
}) {
    return (
        <div className="flex flex-1 flex-col items-center px-6 pt-16 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-200" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertOctagon className="h-8 w-8" />
                </span>
            </div>

            <p className="mt-5 text-lg font-semibold text-(--color-ink)">
                Mengirim dalam {cancelSecondsLeft} detik...
            </p>
            <p className="mt-1 text-sm text-(--color-ink)/50">
                Batalkan sekarang jika ini tidak sengaja tertekan.
            </p>

            <div className="mt-6 w-full space-y-2">
                <p className="text-xs font-medium text-(--color-ink)/45">
                    Tambahkan konteks (opsional)
                </p>
                <div className="grid grid-cols-4 gap-2">
                    {reasonOptions.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onSelectReason(key)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium ${
                                selectedReason === key
                                    ? 'border-red-300 bg-red-50 text-red-600'
                                    : 'border-(--color-ink)/8 text-(--color-ink)/50'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1" />

            <button
                type="button"
                onClick={onCancelFalseAlarm}
                className="mb-8 flex items-center gap-1.5 text-sm text-(--color-ink)/45 underline-offset-2 hover:underline"
            >
                <X className="h-3.5 w-3.5" />
                Ini alarm palsu, batalkan
            </button>
        </div>
    );
}

function SendingView() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-red-600" />
            <p className="text-sm font-medium text-(--color-ink)/60">
                Mengirim sinyal darurat...
            </p>
        </div>
    );
}

function SentView() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-200" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertOctagon className="h-8 w-8" />
                </span>
            </div>

            <p className="mt-5 text-lg font-semibold text-(--color-ink)">
                Sinyal Darurat Terkirim
            </p>
            <p className="mt-1 text-sm text-(--color-ink)/50">
                Keamanan di kompleks Anda sudah diberi notifikasi.
            </p>

            <Link
                href="/tenant"
                className="mt-8 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-medium text-white"
            >
                Kembali ke Beranda
            </Link>
        </div>
    );
}

function CancelledView() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--color-ink)/6 text-(--color-ink)/50">
                <X className="h-8 w-8" />
            </div>
            <p className="mt-4 text-lg font-semibold text-(--color-ink)">
                Alarm Dibatalkan
            </p>
            <p className="mt-1 text-sm text-(--color-ink)/50">
                Tidak ada sinyal yang terkirim ke keamanan.
            </p>

            <Link
                href="/tenant"
                className="mt-8 rounded-full bg-(--color-ink) px-6 py-3 text-sm font-medium text-white"
            >
                Kembali ke Beranda
            </Link>
        </div>
    );
}

function ErrorView({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertOctagon className="h-8 w-8" />
            </div>
            <p className="mt-4 text-lg font-semibold text-(--color-ink)">
                Gagal Mengirim
            </p>
            <p className="mt-1 text-sm text-(--color-ink)/50">{message}</p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-8 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white"
            >
                Coba Lagi
            </button>
        </div>
    );
}

TenantPanic.layout = (page: React.ReactNode) => page;
