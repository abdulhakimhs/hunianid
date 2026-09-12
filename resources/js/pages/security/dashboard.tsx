import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    CheckCircle2,
    ChevronRight,
    Clock,
    LogOut,
    QrCode,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import SecurityBottomNav from '@/components/security/bottom-nav';
import PanicAlertOverlay from '@/components/security/panic-alert-overlay';
import type { PanicAlert } from '@/components/security/panic-alert-overlay';

// Dummy data — swap for real props from the controller once the backend
// endpoint exists (GET /security/dashboard).

const dummyGuard = {
    name: 'Budi Santoso',
    shift: 'Shift Pagi (06:00 – 14:00)',
};

const dummyStats = {
    scansToday: 42,
    visitorsInside: 7,
    pendingApproval: 2,
};

const dummyActivity = [
    {
        id: 1,
        visitor: 'Andi Wijaya',
        unit: 'Blok C-12',
        time: '10 menit lalu',
        status: 'valid' as const,
    },
    {
        id: 2,
        visitor: 'Siti Rahma',
        unit: 'Blok A-05',
        time: '25 menit lalu',
        status: 'valid' as const,
    },
    {
        id: 3,
        visitor: 'Unknown QR',
        unit: '—',
        time: '38 menit lalu',
        status: 'invalid' as const,
    },
    {
        id: 4,
        visitor: 'Dewi Lestari',
        unit: 'Blok B-08',
        time: '1 jam lalu',
        status: 'expired' as const,
    },
    {
        id: 5,
        visitor: 'Rudi Hartono',
        unit: 'Blok C-01',
        time: '1 jam lalu',
        status: 'valid' as const,
    },
];

function greeting() {
    const hour = new Date().getHours();

    if (hour < 11) {
        return 'Selamat pagi';
    }

    if (hour < 15) {
        return 'Selamat siang';
    }

    if (hour < 19) {
        return 'Selamat sore';
    }

    return 'Selamat malam';
}

const statusMeta = {
    valid: {
        label: 'Valid',
        icon: CheckCircle2,
        className: 'text-(--color-mint-deep) bg-(--color-mint)/12',
    },
    invalid: {
        label: 'Tidak valid',
        icon: XCircle,
        className: 'text-red-600 bg-red-50',
    },
    expired: {
        label: 'Kedaluwarsa',
        icon: Clock,
        className: 'text-amber-600 bg-amber-50',
    },
};

export default function SecurityDashboard() {
    const [activeAlert, setActiveAlert] = useState<PanicAlert | null>(null);

    function simulateAlert() {
        if (activeAlert) {
            return;
        }

        setActiveAlert({
            id: Date.now(),
            tenantName: 'Dewi Lestari',
            unit: 'Blok B-08',
            triggeredAt: Date.now(),
        });
    }

    function acknowledgeAlert(id: number) {
        if (!activeAlert || activeAlert.id !== id) {
            return;
        }

        setActiveAlert(null);
    }

    return (
        <>
            <Head title="Beranda" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--color-mint)/15 text-(--color-mint-deep)">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-(--color-ink)/50">
                                {greeting()},
                            </p>
                            <p className="text-sm font-semibold text-(--color-ink)">
                                {dummyGuard.name}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-(--color-ink)/40 hover:bg-(--color-ink)/5"
                        aria-label="Keluar"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-5 pb-4">
                    <div className="flex items-center gap-1.5 text-xs text-(--color-ink)/45">
                        <Clock className="h-3.5 w-3.5" />
                        {dummyGuard.shift}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-28">
                    {/* Primary CTA */}
                    <Link href="/security/scan" className="block">
                        <div className="flex items-center gap-4 rounded-2xl bg-(--color-ink) px-5 py-5 text-(--color-surface) shadow-sm transition active:scale-[0.99]">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                                <QrCode className="h-7 w-7" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base font-semibold">
                                    Scan Pass Tamu
                                </p>
                                <p className="text-sm text-white/60">
                                    Pindai kode QR untuk verifikasi
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/50" />
                        </div>
                    </Link>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard
                            label="Scan hari ini"
                            value={dummyStats.scansToday}
                        />
                        <StatCard
                            label="Tamu di dalam"
                            value={dummyStats.visitorsInside}
                        />
                        <StatCard
                            label="Perlu approval"
                            value={dummyStats.pendingApproval}
                            accent
                        />
                    </div>

                    {/* Recent activity */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-(--color-ink)">
                                Aktivitas terbaru
                            </h2>
                            <Link
                                href="/security/history"
                                className="text-xs font-medium text-(--color-mint-deep)"
                            >
                                Lihat semua
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {dummyActivity.map((item) => {
                                const meta = statusMeta[item.status];
                                const StatusIcon = meta.icon;

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 rounded-xl border border-(--color-ink)/8 bg-(--color-surface) px-3.5 py-3"
                                    >
                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                                        >
                                            <StatusIcon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-(--color-ink)">
                                                {item.visitor}
                                            </p>
                                            <p className="text-xs text-(--color-ink)/45">
                                                {item.unit}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-xs text-(--color-ink)/40">
                                            {item.time}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dev-only: stands in for the real-time push that will
                        arrive via WebSocket/Web Push once the backend exists.
                        Remove once panic alerts are wired to a real trigger. */}
                    <button
                        type="button"
                        onClick={simulateAlert}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-(--color-ink)/20 px-4 py-3 text-xs font-medium text-(--color-ink)/50"
                    >
                        <AlertOctagon className="h-3.5 w-3.5" />
                        [Dev] Simulasikan Panic Alert
                    </button>
                </div>

                <SecurityBottomNav active="home" />
            </div>

            {activeAlert && (
                <PanicAlertOverlay
                    alert={activeAlert}
                    onAcknowledge={acknowledgeAlert}
                />
            )}
        </>
    );
}

function StatCard({
    label,
    value,
    accent = false,
}: {
    label: string;
    value: number;
    accent?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border px-3 py-3 text-center ${
                accent
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-(--color-ink)/8 bg-(--color-surface)'
            }`}
        >
            <p
                className={`text-xl font-semibold ${accent ? 'text-amber-600' : 'text-(--color-ink)'}`}
            >
                {value}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-(--color-ink)/50">
                {label}
            </p>
        </div>
    );
}

SecurityDashboard.layout = (page: React.ReactNode) => page;
