import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Flashlight,
    FlashlightOff,
    Keyboard,
    Loader2,
    RotateCcw,
    User,
    XCircle,
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import QrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url';
import { useEffect, useRef, useState } from 'react';
// Vite needs the worker resolved as a URL asset, not bundled inline.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { postJson } from '@/lib/api';

QrScanner.WORKER_PATH = QrScannerWorkerPath;

type ScanStatus = 'valid' | 'invalid' | 'expired' | 'used';

type VisitorResult = {
    status: ScanStatus;
    visitor?: {
        name: string;
        unit: string;
        purpose: string;
        validUntil: string;
    };
};

function verifyPass(code: string): Promise<VisitorResult> {
    return postJson<VisitorResult>('/security/scan/verify', { code });
}

function confirmEntry(code: string): Promise<void> {
    return postJson('/security/scan/confirm', { code });
}

type Phase = 'scanning' | 'processing' | 'result' | 'camera-error';

export default function SecurityScan() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScanner | null>(null);

    const [phase, setPhase] = useState<Phase>('scanning');
    const [result, setResult] = useState<VisitorResult | null>(null);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [manualOpen, setManualOpen] = useState(false);
    const [manualCode, setManualCode] = useState('');

    useEffect(() => {
        if (!videoRef.current) {
            return;
        }

        const scanner = new QrScanner(
            videoRef.current,
            (result) => handleDecoded(result.data),
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
                preferredCamera: 'environment',
                maxScansPerSecond: 5,
            },
        );

        scannerRef.current = scanner;

        scanner
            .start()
            .then(() => scanner.hasFlash())
            .then(setTorchSupported)
            .catch(() => setPhase('camera-error'));

        return () => {
            scanner.stop();
            scanner.destroy();
            scannerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleDecoded(code: string) {
        if (phase !== 'scanning') {
            return;
        } // ignore extra frames while processing

        scannerRef.current?.stop();
        setPhase('processing');
        setScannedCode(code);

        if (navigator.vibrate) {
            navigator.vibrate(80);
        }

        verifyPass(code)
            .then((data) => {
                setResult(data);
                setPhase('result');
            })
            .catch(() => {
                setResult({ status: 'invalid' });
                setPhase('result');
            });
    }

    function allowEntry() {
        if (!scannedCode || confirming) {
            return;
        }

        setConfirming(true);

        confirmEntry(scannedCode)
            .then(() => scanAgain())
            .finally(() => setConfirming(false));
    }

    function submitManualCode() {
        if (!manualCode.trim()) {
            return;
        }

        setManualOpen(false);
        handleDecoded(manualCode.trim());
        setManualCode('');
    }

    function scanAgain() {
        setResult(null);
        setPhase('scanning');
        scannerRef.current?.start().catch(() => setPhase('camera-error'));
    }

    async function toggleTorch() {
        if (!scannerRef.current) {
            return;
        }

        const next = !torchOn;
        await scannerRef.current.toggleFlash();
        setTorchOn(next);
    }

    return (
        <>
            <Head title="Scan Pass" />

            <div className="relative flex min-h-screen w-full flex-col bg-black">
                {/* Camera feed */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                />

                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
                    <Link
                        href="/security"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>

                    {torchSupported && phase === 'scanning' && (
                        <button
                            type="button"
                            onClick={toggleTorch}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                        >
                            {torchOn ? (
                                <FlashlightOff className="h-5 w-5" />
                            ) : (
                                <Flashlight className="h-5 w-5" />
                            )}
                        </button>
                    )}
                </div>

                {/* Scanning hint */}
                {phase === 'scanning' && (
                    <div className="relative z-10 mt-6 text-center">
                        <p className="text-sm font-medium text-white/90">
                            Arahkan kamera ke kode QR pass tamu
                        </p>
                    </div>
                )}

                <div className="flex-1" />

                {/* Manual entry trigger */}
                {phase === 'scanning' && (
                    <div className="relative z-10 flex justify-center pb-8">
                        <button
                            type="button"
                            onClick={() => setManualOpen(true)}
                            className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm"
                        >
                            <Keyboard className="h-4 w-4" />
                            Masukkan kode manual
                        </button>
                    </div>
                )}

                {/* Camera error state */}
                {phase === 'camera-error' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/90 px-8 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-400" />
                        <div>
                            <p className="text-base font-semibold text-white">
                                Kamera tidak dapat diakses
                            </p>
                            <p className="mt-1 text-sm text-white/60">
                                Periksa izin kamera di pengaturan browser, atau
                                gunakan kode manual.
                            </p>
                        </div>
                        <Button
                            onClick={() => setManualOpen(true)}
                            className="mt-2"
                        >
                            <Keyboard className="h-4 w-4" />
                            Masukkan kode manual
                        </Button>
                    </div>
                )}

                {/* Processing overlay */}
                {phase === 'processing' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                        <p className="text-sm font-medium text-white/80">
                            Memverifikasi pass...
                        </p>
                    </div>
                )}

                {/* Manual entry sheet */}
                {manualOpen && (
                    <div className="absolute inset-0 z-30 flex items-end bg-black/50">
                        <div className="w-full rounded-t-3xl bg-(--color-surface) p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />
                            <p className="mb-3 text-sm font-semibold text-(--color-ink)">
                                Kode Pass Manual
                            </p>
                            <Input
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="Masukkan kode pass"
                                className="h-12 text-base"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && submitManualCode()
                                }
                            />
                            <div className="mt-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    className="h-12 flex-1"
                                    onClick={() => setManualOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className="h-12 flex-1"
                                    disabled={!manualCode.trim()}
                                    onClick={submitManualCode}
                                >
                                    Verifikasi
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Result sheet */}
                {phase === 'result' && result && (
                    <ResultSheet
                        result={result}
                        onScanAgain={scanAgain}
                        onAllowEntry={allowEntry}
                        confirming={confirming}
                    />
                )}
            </div>
        </>
    );
}

function ResultSheet({
    result,
    onScanAgain,
    onAllowEntry,
    confirming,
}: {
    result: VisitorResult;
    onScanAgain: () => void;
    onAllowEntry: () => void;
    confirming: boolean;
}) {
    const config = {
        valid: {
            icon: CheckCircle2,
            iconClass:
                'text-[color:var(--color-mint-deep)] bg-[color:var(--color-mint)]/15',
            title: 'Pass Valid',
        },
        expired: {
            icon: Clock,
            iconClass: 'text-amber-600 bg-amber-50',
            title: 'Pass Kedaluwarsa',
        },
        used: {
            icon: XCircle,
            iconClass: 'text-amber-600 bg-amber-50',
            title: 'Pass Sudah Digunakan',
        },
        invalid: {
            icon: XCircle,
            iconClass: 'text-red-600 bg-red-50',
            title: 'Pass Tidak Valid',
        },
    }[result.status];

    const Icon = config.icon;

    return (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50">
            <div className="w-full rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <div className="flex flex-col items-center text-center">
                    <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full ${config.iconClass}`}
                    >
                        <Icon className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-(--color-ink)">
                        {config.title}
                    </p>
                </div>

                {result.status === 'valid' && result.visitor && (
                    <div className="mt-5 space-y-3 rounded-2xl bg-(--color-ink)/3 p-4">
                        <InfoRow
                            icon={User}
                            label="Nama"
                            value={result.visitor.name}
                        />
                        <InfoRow
                            icon={User}
                            label="Unit tujuan"
                            value={result.visitor.unit}
                        />
                        <InfoRow
                            icon={Clock}
                            label="Berlaku hingga"
                            value={result.visitor.validUntil}
                        />
                        <p className="pt-1 text-center text-xs text-(--color-ink)/45">
                            {result.visitor.purpose}
                        </p>
                    </div>
                )}

                {result.status === 'expired' && (
                    <p className="mt-4 text-center text-sm text-(--color-ink)/55">
                        Pass ini sudah melewati batas waktu kunjungan. Hubungi
                        penghuni untuk pass baru.
                    </p>
                )}

                {result.status === 'used' && (
                    <p className="mt-4 text-center text-sm text-(--color-ink)/55">
                        Pass ini sudah pernah digunakan untuk masuk sebelumnya.
                    </p>
                )}

                {result.status === 'invalid' && (
                    <p className="mt-4 text-center text-sm text-(--color-ink)/55">
                        Kode tidak dikenali. Pastikan QR berasal dari sistem
                        HunianID.
                    </p>
                )}

                <div className="mt-6 flex gap-2">
                    {result.status === 'valid' && (
                        <Button
                            className="h-12 flex-1 bg-(--color-mint-deep) hover:bg-(--color-mint-deep)/90"
                            onClick={onAllowEntry}
                            disabled={confirming}
                        >
                            {confirming && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Izinkan Masuk
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onScanAgain}
                    >
                        <RotateCcw className="h-4 w-4" />
                        Scan Lagi
                    </Button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof User;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-surface)">
                <Icon className="h-4 w-4 text-(--color-ink)/50" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-(--color-ink)/45">{label}</p>
                <p className="truncate text-sm font-medium text-(--color-ink)">
                    {value}
                </p>
            </div>
        </div>
    );
}

// Fullscreen camera UI — no shared layout wrapper.
SecurityScan.layout = (page: React.ReactNode) => page;
