import { Head, Link } from '@inertiajs/react';
import {
    Clock,
    Loader2,
    MessageSquare,
    Plus,
    Sparkles,
    ShieldAlert,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TicketCategory = 'maintenance' | 'security' | 'cleanliness' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'closed';

type Ticket = {
    id: number;
    subject: string;
    category: TicketCategory;
    status: TicketStatus;
    lastMessage: string;
    lastMessageAt: string;
    hasUnreadReply: boolean;
};

const dummyTickets: Ticket[] = [
    {
        id: 1,
        subject: 'AC unit tidak dingin',
        category: 'maintenance',
        status: 'in_progress',
        lastMessage: 'Teknisi akan datang besok pukul 10:00.',
        lastMessageAt: '2026-09-16T14:20:00',
        hasUnreadReply: true,
    },
    {
        id: 2,
        subject: 'Lampu koridor lantai 3 mati',
        category: 'maintenance',
        status: 'open',
        lastMessage: 'Laporan diterima, menunggu penjadwalan.',
        lastMessageAt: '2026-09-15T09:05:00',
        hasUnreadReply: false,
    },
    {
        id: 3,
        subject: 'Sampah menumpuk di area parkir',
        category: 'cleanliness',
        status: 'closed',
        lastMessage: 'Sudah dibersihkan, terima kasih laporannya.',
        lastMessageAt: '2026-09-10T11:30:00',
        hasUnreadReply: false,
    },
    {
        id: 4,
        subject: 'CCTV blok B tidak berfungsi',
        category: 'security',
        status: 'closed',
        lastMessage: 'Kamera sudah diperbaiki oleh vendor.',
        lastMessageAt: '2026-09-02T16:00:00',
        hasUnreadReply: false,
    },
];

const categoryMeta: Record<
    TicketCategory,
    { label: string; icon: typeof Wrench; className: string }
> = {
    maintenance: {
        label: 'Perbaikan',
        icon: Wrench,
        className: 'bg-amber-100 text-amber-600',
    },
    security: {
        label: 'Keamanan',
        icon: ShieldAlert,
        className: 'bg-red-100 text-red-600',
    },
    cleanliness: {
        label: 'Kebersihan',
        icon: Sparkles,
        className: 'bg-(--color-mint)/12 text-(--color-mint-deep)',
    },
    other: {
        label: 'Lainnya',
        icon: MessageSquare,
        className: 'bg-(--color-ink)/8 text-(--color-ink)/60',
    },
};

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

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));

    if (hours < 1) {
        return 'Baru saja';
    }

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    const days = Math.floor(hours / 24);

    return `${days} hari lalu`;
}

export default function TenantTickets() {
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const [createOpen, setCreateOpen] = useState(false);

    const active = useMemo(
        () => dummyTickets.filter((t) => t.status !== 'closed'),
        [],
    );

    const history = useMemo(
        () => dummyTickets.filter((t) => t.status === 'closed'),
        [],
    );

    const list = tab === 'active' ? active : history;

    return (
        <>
            <Head title="Tiket" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader
                    title="Tiket"
                    backHref="/tenant"
                    tone="tenant"
                    rightSlot={
                        <button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
                            aria-label="Buat tiket baru"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    }
                />

                <div className="flex gap-1 px-5 pt-4">
                    <TabButton
                        active={tab === 'active'}
                        onClick={() => setTab('active')}
                        label={`Aktif (${active.length})`}
                    />
                    <TabButton
                        active={tab === 'history'}
                        onClick={() => setTab('history')}
                        label="Riwayat"
                    />
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-4 pb-24">
                    {list.length === 0 && (
                        <EmptyState
                            message={
                                tab === 'active'
                                    ? 'Belum ada tiket aktif.'
                                    : 'Belum ada riwayat tiket.'
                            }
                        />
                    )}

                    {list.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </div>

                <Button
                    onClick={() => setCreateOpen(true)}
                    className="fixed inset-x-5 bottom-5 mx-auto h-13 max-w-sm bg-(--color-sky-deep) text-base hover:bg-(--color-sky-deep)/90"
                >
                    <Plus className="h-5 w-5" />
                    Buat Tiket Baru
                </Button>
            </div>

            {createOpen && (
                <CreateTicketSheet onClose={() => setCreateOpen(false)} />
            )}
        </>
    );
}

function TabButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                    ? 'bg-(--color-ink) text-(--color-surface)'
                    : 'bg-(--color-ink)/6 text-(--color-ink)/60'
            }`}
        >
            {label}
        </button>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <MessageSquare className="h-8 w-8 text-(--color-ink)/25" />
            <p className="text-sm text-(--color-ink)/45">{message}</p>
        </div>
    );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
    const category = categoryMeta[ticket.category];
    const status = statusMeta[ticket.status];
    const CategoryIcon = category.icon;

    return (
        <Link href={`/tenant/tickets/${ticket.id}`} className="block">
            <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.className}`}
                    >
                        <CategoryIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-(--color-ink)">
                                {ticket.subject}
                            </p>

                            {ticket.hasUnreadReply && (
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                            )}
                        </div>

                        <p className="mt-0.5 truncate text-xs text-(--color-ink)/50">
                            {ticket.lastMessage}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}
                            >
                                {status.label}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-(--color-ink)/40">
                                <Clock className="h-3 w-3" />
                                {timeAgo(ticket.lastMessageAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function CreateTicketSheet({ onClose }: { onClose: () => void }) {
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState<TicketCategory>('maintenance');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function submit() {
        if (!subject.trim() || !description.trim()) {
            return;
        }

        setSubmitting(true);

        // Dummy create — swap for a real POST /tenant/tickets call, then
        // redirect to /tenant/tickets/{id} with the created ticket.
        setTimeout(() => {
            setSubmitting(false);
            onClose();
        }, 500);
    }

    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <p className="mb-4 text-base font-semibold text-(--color-ink)">
                    Buat Tiket Baru
                </p>

                <div className="space-y-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="subject">Judul</Label>
                        <Input
                            id="subject"
                            autoFocus
                            placeholder="cth. AC unit tidak dingin"
                            className="h-12 text-base"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Kategori</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {(
                                Object.keys(categoryMeta) as TicketCategory[]
                            ).map((key) => {
                                const meta = categoryMeta[key];
                                const Icon = meta.icon;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setCategory(key)}
                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium ${
                                            category === key
                                                ? 'border-(--color-sky-deep) bg-(--color-sky)/10 text-(--color-sky-deep)'
                                                : 'border-(--color-ink)/8 text-(--color-ink)/60'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="description">Deskripsi</Label>
                        <Textarea
                            id="description"
                            placeholder="Jelaskan masalah Anda secara detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-5 flex gap-2">
                    <Button
                        variant="outline"
                        className="h-12 flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        className="h-12 flex-1"
                        onClick={submit}
                        disabled={
                            !subject.trim() || !description.trim() || submitting
                        }
                    >
                        {submitting && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Kirim Tiket
                    </Button>
                </div>
            </div>
        </div>
    );
}

TenantTickets.layout = (page: React.ReactNode) => page;
