import { Head, router } from '@inertiajs/react';
import { Check, Lock } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

type TicketStatus = 'open' | 'in_progress' | 'closed';

type ActivityEntry = {
    id: number;
    sender: 'tenant' | 'staff' | 'system';
    body: string;
    photoUrl?: string | null;
    sentAt: string;
};

type TicketDetail = {
    id: number;
    subject: string;
    status: TicketStatus;
    activity: ActivityEntry[];
};

type Props = {
    ticket: TicketDetail;
};

const steps: { key: TicketStatus; label: string }[] = [
    { key: 'open', label: 'Dilaporkan' },
    { key: 'in_progress', label: 'Diproses' },
    { key: 'closed', label: 'Selesai' },
];

function stepIndex(status: TicketStatus) {
    return steps.findIndex((s) => s.key === status);
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function TenantTicketShow({ ticket }: Props) {
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const isClosed = ticket.status === 'closed';
    const currentStep = stepIndex(ticket.status);

    function confirmClose() {
        router.patch(`/tenant/tickets/${ticket.id}/close`, {}, { onSuccess: () => setCloseConfirmOpen(false) });
    }

    const originalReport = ticket.activity[0];

    return (
        <>
            <Head title={ticket.subject} />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-bg)">
                <PageHeader title={ticket.subject} backHref="/tenant/tickets" tone="tenant" />

                <div className="flex flex-col gap-4 px-5 py-5">
                    <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => (
                                <div key={step.key} className="flex flex-1 flex-col items-center">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                            index <= currentStep
                                                ? 'bg-(--color-mint) text-white'
                                                : 'bg-(--color-ink)/8 text-(--color-ink)/40'
                                        }`}
                                    >
                                        {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                                    </div>
                                    <p
                                        className={`mt-1.5 text-center text-[11px] font-medium ${
                                            index <= currentStep ? 'text-(--color-ink)' : 'text-(--color-ink)/40'
                                        }`}
                                    >
                                        {step.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {originalReport && (
                        <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                            <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Laporan Anda</p>
                            <p className="mt-2 text-sm leading-relaxed text-(--color-ink)">{originalReport.body}</p>
                            {originalReport.photoUrl && (
                                <a href={originalReport.photoUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                                    <img
                                        src={originalReport.photoUrl}
                                        alt="Lampiran foto"
                                        className="max-h-56 w-full rounded-xl object-cover"
                                    />
                                </a>
                            )}
                            <p className="mt-2 text-xs text-(--color-ink)/40">{formatTime(originalReport.sentAt)}</p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-5">
                        <p className="text-xs font-semibold tracking-wide text-(--color-ink)/40 uppercase">Perkembangan</p>
                        <div className="mt-3 space-y-2.5">
                            {ticket.activity.slice(1).length === 0 && (
                                <p className="text-sm text-(--color-ink)/45">Belum ada pembaruan.</p>
                            )}
                            {ticket.activity.slice(1).map((entry) => (
                                <div key={entry.id} className="rounded-xl bg-(--color-bg) px-3 py-2.5 text-sm text-(--color-ink)/75">
                                    <p>{entry.body}</p>
                                    {entry.photoUrl && (
                                        <a href={entry.photoUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                                            <img
                                                src={entry.photoUrl}
                                                alt="Lampiran foto"
                                                className="max-h-56 w-full rounded-xl object-cover"
                                            />
                                        </a>
                                    )}
                                    <p className="mt-0.5 text-xs text-(--color-ink)/40">{formatTime(entry.sentAt)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {isClosed ? (
                        <div className="flex items-center justify-center gap-2 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) px-5 py-4 text-sm text-(--color-ink)/45">
                            <Lock className="h-4 w-4" />
                            Tiket ini sudah ditutup
                        </div>
                    ) : (
                        <Button variant="outline" className="h-12" onClick={() => setCloseConfirmOpen(true)}>
                            Tutup Tiket
                        </Button>
                    )}
                </div>
            </div>

            {closeConfirmOpen && <CloseConfirmSheet onCancel={() => setCloseConfirmOpen(false)} onConfirm={confirmClose} />}
        </>
    );
}

function CloseConfirmSheet({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-mint)/15 text-(--color-mint-deep)">
                        <Check className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-base font-semibold text-(--color-ink)">Tutup tiket ini?</p>
                    <p className="mt-1 text-sm text-(--color-ink)/50">
                        Buat tiket baru jika masalah muncul kembali setelah ini ditutup.
                    </p>
                </div>

                <div className="mt-5 flex gap-2">
                    <Button variant="outline" className="h-12 flex-1" onClick={onCancel}>
                        Batal
                    </Button>
                    <Button className="h-12 flex-1" onClick={onConfirm}>
                        Tutup Tiket
                    </Button>
                </div>
            </div>
        </div>
    );
}

TenantTicketShow.layout = (page: React.ReactNode) => page;
