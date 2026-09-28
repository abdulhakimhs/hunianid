import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    Clock,
    Compass,
    Home,
    Loader2,
    LucideIcon,
    ServerCrash,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import HunianLogo from '@/components/hunian-logo';
import { postJson } from '@/lib/api';
import { dashboard, home } from '@/routes';
import type { Membership } from '@/types';

type Props = {
    status: number;
    message?: string | null;
};

type StatusCopy = {
    icon: LucideIcon;
    accent: string;
    accentBg: string;
    title: string;
    fallback: string;
};

const STATUS_COPY: Record<number, StatusCopy> = {
    403: {
        icon: ShieldAlert,
        accent: 'text-[color:var(--color-coral)]',
        accentBg: 'bg-[color:var(--color-coral)]/10',
        title: 'Akses Ditolak',
        fallback: 'Anda tidak memiliki akses untuk membuka halaman ini.',
    },
    404: {
        icon: Compass,
        accent: 'text-[color:var(--color-sky-deep)]',
        accentBg: 'bg-[color:var(--color-sky)]/10',
        title: 'Halaman Tidak Ditemukan',
        fallback: 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.',
    },
    419: {
        icon: Clock,
        accent: 'text-[color:var(--color-sky-deep)]',
        accentBg: 'bg-[color:var(--color-sky)]/10',
        title: 'Sesi Berakhir',
        fallback: 'Sesi Anda sudah kedaluwarsa. Silakan muat ulang halaman dan coba lagi.',
    },
    429: {
        icon: Clock,
        accent: 'text-[color:var(--color-coral)]',
        accentBg: 'bg-[color:var(--color-coral)]/10',
        title: 'Terlalu Banyak Permintaan',
        fallback: 'Anda melakukan terlalu banyak permintaan. Silakan coba lagi sebentar lagi.',
    },
    500: {
        icon: ServerCrash,
        accent: 'text-[color:var(--color-coral)]',
        accentBg: 'bg-[color:var(--color-coral)]/10',
        title: 'Terjadi Kesalahan',
        fallback: 'Ada yang tidak beres di server kami. Tim kami sudah diberi tahu.',
    },
    503: {
        icon: ServerCrash,
        accent: 'text-[color:var(--color-coral)]',
        accentBg: 'bg-[color:var(--color-coral)]/10',
        title: 'Sedang Pemeliharaan',
        fallback: 'Layanan sedang tidak tersedia sementara. Silakan coba lagi sebentar lagi.',
    },
};

function membershipLabel(m: Membership): string {
    return `${m.complexName} · ${m.areaName} — ${m.roleLabel}`;
}

export default function ErrorPage({ status, message }: Props) {
    const { auth } = usePage().props;
    const [switching, setSwitching] = useState<number | null>(null);

    const copy = STATUS_COPY[status] ?? STATUS_COPY[500];
    const Icon = copy.icon;
    const description = message || copy.fallback;

    const memberships = auth?.memberships ?? [];
    const currentMembershipId = auth?.currentMembershipId ?? null;
    const showSwitcher = status === 403 && memberships.length > 1;

    function switchTo(membershipId: number) {
        if (membershipId === currentMembershipId || switching !== null) {
            return;
        }

        setSwitching(membershipId);

        postJson<{ redirect: string }>('/switch-membership', { membership_id: membershipId })
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch(() => setSwitching(null));
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[color:var(--color-bg)] p-6">
            <Head title={copy.title} />

            <div className="w-full max-w-md">
                <div className="flex flex-col gap-7">
                    <div className="flex flex-col items-center gap-3">
                        <Link href={home()}>
                            <HunianLogo />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated sm:p-7">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${copy.accentBg} ${copy.accent}`}>
                                <Icon className="h-7 w-7" />
                            </span>

                            <div className="flex flex-col gap-1.5">
                                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-[color:var(--color-ink)]/40 uppercase">
                                    Error {status}
                                </p>
                                <h1 className="font-display text-xl font-bold tracking-tight text-[color:var(--color-ink)]">
                                    {copy.title}
                                </h1>
                                <p className="text-sm leading-relaxed text-[color:var(--color-ink)]/60">{description}</p>
                            </div>
                        </div>

                        {showSwitcher && (
                            <div className="mt-6 border-t border-[color:var(--color-ink)]/8 pt-5">
                                <p className="mb-2.5 text-[11px] font-semibold tracking-[0.2em] text-[color:var(--color-ink)]/40 uppercase">
                                    Ganti area / peran
                                </p>
                                <div className="space-y-1.5">
                                    {memberships.map((m) => {
                                        const isActive = m.id === currentMembershipId;

                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                disabled={switching !== null}
                                                onClick={() => switchTo(m.id)}
                                                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition disabled:opacity-60 ${
                                                    isActive
                                                        ? 'border-[color:var(--color-mint)]/30 bg-[color:var(--color-mint)]/8'
                                                        : 'border-[color:var(--color-ink)]/8 hover:bg-[color:var(--color-ink)]/4'
                                                }`}
                                            >
                                                <span className="min-w-0 truncate font-medium text-[color:var(--color-ink)]">
                                                    {membershipLabel(m)}
                                                </span>
                                                {switching === m.id ? (
                                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--color-ink)]/40" />
                                                ) : isActive ? (
                                                    <Check className="h-4 w-4 shrink-0 text-[color:var(--color-mint-deep)]" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                            <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
                                <ArrowLeft className="h-4 w-4" /> Kembali
                            </Button>
                            <Button asChild className="w-full">
                                <Link href={auth?.user ? dashboard() : home()}>
                                    <Home className="h-4 w-4" /> {auth?.user ? 'Ke Dashboard' : 'Ke Beranda'}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {status >= 500 && (
                        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[color:var(--color-ink)]/40">
                            <AlertTriangle className="h-3.5 w-3.5" /> Jika masalah berlanjut, hubungi tim dukungan kami.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
