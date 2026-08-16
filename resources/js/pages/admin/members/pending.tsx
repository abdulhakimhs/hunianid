import { Head, router } from '@inertiajs/react';
import { Check, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type PendingMember = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    created_at: string;
};

type Props = {
    pending: PendingMember[];
    areaName: string;
};

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);

    if (minutes < 1) {
        return 'Baru saja';
    }

    if (minutes < 60) {
        return `${minutes} menit lalu`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    const days = Math.round(hours / 24);

    return `${days} hari lalu`;
}

export default function PendingMembers({ pending, areaName }: Props) {
    const [busyId, setBusyId] = useState<number | null>(null);

    function approve(id: number) {
        setBusyId(id);
        router.post(`/admin/members/${id}/approve`, {}, { onFinish: () => setBusyId(null) });
    }

    function reject(id: number) {
        setBusyId(id);
        router.post(`/admin/members/${id}/reject`, {}, { onFinish: () => setBusyId(null) });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
            <Head title="Menunggu persetujuan" />

            <div className="flex flex-col gap-1">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-coral)]">
                    Admin · Menunggu Persetujuan
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl">
                    Persetujuan Anggota — {areaName}
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-[color:var(--color-ink)]/60">
                    {pending.length > 0
                        ? `${pending.length} warga menunggu persetujuan Anda untuk bergabung.`
                        : 'Semua permintaan bergabung sudah ditinjau.'}
                </p>
            </div>

            {pending.length === 0 ? (
                <section className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] px-5 py-14 text-center shadow-elevated">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]">
                        <Check className="h-5 w-5" />
                    </span>
                    <p className="text-sm text-[color:var(--color-ink)]/55">Tidak ada anggota yang menunggu persetujuan.</p>
                </section>
            ) : (
                <section className="overflow-hidden rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] shadow-elevated">
                    <div className="divide-y divide-[color:var(--color-ink)]/8">
                        {pending.map((m) => (
                            <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-coral)]/12 text-sm font-semibold text-[color:var(--color-coral)]">
                                    {initials(m.name)}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-[color:var(--color-ink)]">{m.name}</p>
                                    <p className="truncate text-sm text-[color:var(--color-ink)]/55">
                                        {m.email}
                                        {m.phone ? ` · ${m.phone}` : ''}
                                    </p>
                                </div>

                                <span className="hidden shrink-0 items-center gap-1 text-xs text-[color:var(--color-ink)]/45 sm:inline-flex">
                                    <Clock className="h-3.5 w-3.5" />
                                    {relativeTime(m.created_at)}
                                </span>

                                <div className="flex shrink-0 gap-2">
                                    <Button size="sm" disabled={busyId === m.id} onClick={() => approve(m.id)}>
                                        <Check className="h-4 w-4" /> Setujui
                                    </Button>
                                    <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => reject(m.id)}>
                                        <X className="h-4 w-4" /> Tolak
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
