import { Head } from '@inertiajs/react';
import { Check, Lock, Send, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

type TicketStatus = 'open' | 'in_progress' | 'closed';

type Message = {
    id: number;
    sender: 'tenant' | 'staff' | 'system';
    staffName?: string;
    body: string;
    sentAt: string;
};

type TicketDetail = {
    id: number;
    subject: string;
    status: TicketStatus;
    messages: Message[];
};

// Dummy data — swap for a real `ticket` prop passed from the Laravel
// controller (GET /tenant/tickets/{id}, route-model-bound).

const dummyTicket: TicketDetail = {
    id: 1,
    subject: 'AC unit tidak dingin',
    status: 'in_progress',
    messages: [
        {
            id: 1,
            sender: 'tenant',
            body: 'AC di kamar utama tidak dingin sejak kemarin malam, sudah dicoba dinyalakan ulang tapi tetap sama.',
            sentAt: '2026-09-15T20:10:00',
        },
        {
            id: 2,
            sender: 'staff',
            staffName: 'Pak Joko (Teknik)',
            body: 'Terima kasih laporannya. Kami jadwalkan pengecekan besok pagi ya.',
            sentAt: '2026-09-16T08:02:00',
        },
        {
            id: 3,
            sender: 'staff',
            staffName: 'Pak Joko (Teknik)',
            body: 'Teknisi akan datang besok pukul 10:00. Mohon pastikan ada yang di unit.',
            sentAt: '2026-09-16T14:20:00',
        },
    ],
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const statusMeta: Record<TicketStatus, { label: string; className: string }> = {
    open: {
        label: 'Terbuka',
        className: 'bg-(--color-sky)/15 text-(--color-sky-deep)',
    },
    in_progress: {
        label: 'Diproses',
        className: 'bg-amber-100 text-amber-600',
    },
    closed: {
        label: 'Selesai',
        className: 'bg-(--color-ink)/8 text-(--color-ink)/50',
    },
};

export default function TenantTicketShow({ ticketId }: { ticketId?: number }) {
    const [ticket, setTicket] = useState<TicketDetail>(dummyTicket);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const status = statusMeta[ticket.status];
    const isClosed = ticket.status === 'closed';

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [ticket.messages.length]);

    function sendReply() {
        if (!reply.trim() || isClosed) {
            return;
        }

        setSending(true);

        // Dummy send — swap for a real POST
        // /tenant/tickets/{id}/messages call.
        setTimeout(() => {
            setTicket((prev) => ({
                ...prev,
                messages: [
                    ...prev.messages,
                    {
                        id: Date.now(),
                        sender: 'tenant',
                        body: reply.trim(),
                        sentAt: new Date().toISOString(),
                    },
                ],
            }));

            setReply('');
            setSending(false);
        }, 400);
    }

    function confirmClose() {
        // Dummy close — swap for a real PATCH
        // /tenant/tickets/{id}/close call.
        setTicket((prev) => ({
            ...prev,
            status: 'closed',
            messages: [
                ...prev.messages,
                {
                    id: Date.now(),
                    sender: 'system',
                    body: 'Tiket ditutup oleh penghuni.',
                    sentAt: new Date().toISOString(),
                },
            ],
        }));

        setCloseConfirmOpen(false);
    }

    return (
        <>
            <Head title={ticket.subject} />

            <div className="mx-auto flex h-screen w-full max-w-sm flex-col bg-(--color-surface)">
                <PageHeader
                    title={ticket.subject}
                    backHref="/tenant/tickets"
                    tone="tenant"
                    rightSlot={
                        !isClosed ? (
                            <button
                                type="button"
                                onClick={() => setCloseConfirmOpen(true)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
                                aria-label="Tutup tiket"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        ) : undefined
                    }
                />

                <div className="flex items-center justify-center py-3">
                    <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                    >
                        {status.label}
                    </span>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 space-y-3 overflow-y-auto px-5 pb-4"
                >
                    {ticket.messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </div>

                {isClosed ? (
                    <div className="flex items-center justify-center gap-2 border-t border-(--color-ink)/8 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-sm text-(--color-ink)/45">
                        <Lock className="h-4 w-4" />
                        Tiket ini sudah ditutup
                    </div>
                ) : (
                    <div className="flex items-end gap-2 border-t border-(--color-ink)/8 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                        <textarea
                            rows={1}
                            placeholder="Tulis balasan..."
                            className="max-h-24 flex-1 resize-none rounded-2xl border border-(--color-ink)/10 bg-(--color-surface) px-4 py-2.5 text-sm outline-none focus:border-(--color-sky-deep)"
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendReply();
                                }
                            }}
                        />

                        <button
                            type="button"
                            onClick={sendReply}
                            disabled={!reply.trim() || sending}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-sky-deep) text-white disabled:opacity-40"
                            aria-label="Kirim balasan"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {closeConfirmOpen && (
                <CloseConfirmSheet
                    onCancel={() => setCloseConfirmOpen(false)}
                    onConfirm={confirmClose}
                />
            )}
        </>
    );
}

function MessageBubble({ message }: { message: Message }) {
    if (message.sender === 'system') {
        return (
            <div className="flex justify-center">
                <span className="rounded-full bg-(--color-ink)/6 px-3 py-1 text-[11px] text-(--color-ink)/50">
                    {message.body}
                </span>
            </div>
        );
    }

    const isTenant = message.sender === 'tenant';

    return (
        <div className={`flex ${isTenant ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] ${isTenant ? 'items-end' : 'items-start'} flex flex-col`}
            >
                {!isTenant && (
                    <div className="mb-1 flex items-center gap-1.5 px-1">
                        <ShieldCheck className="h-3 w-3 text-(--color-ink)/40" />
                        <span className="text-[11px] font-medium text-(--color-ink)/50">
                            {message.staffName}
                        </span>
                    </div>
                )}

                <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                        isTenant
                            ? 'rounded-br-sm bg-(--color-sky-deep) text-white'
                            : 'rounded-bl-sm bg-(--color-ink)/6 text-(--color-ink)'
                    }`}
                >
                    {message.body}
                </div>

                <span className="mt-1 px-1 text-[10px] text-(--color-ink)/35">
                    {formatTime(message.sentAt)}
                </span>
            </div>
        </div>
    );
}

function CloseConfirmSheet({
    onCancel,
    onConfirm,
}: {
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <div className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-mint)/15 text-(--color-mint-deep)">
                        <Check className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-base font-semibold text-(--color-ink)">
                        Tutup tiket ini?
                    </p>
                    <p className="mt-1 text-sm text-(--color-ink)/50">
                        Anda tidak akan bisa membalas lagi setelah tiket
                        ditutup. Buat tiket baru jika masalah muncul kembali.
                    </p>
                </div>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onCancel}
                    >
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
