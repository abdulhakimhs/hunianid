import { Head, Link } from '@inertiajs/react';
import { Clock, MessageSquare, ShieldAlert, Sparkles, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTableSearch } from '@/hooks/use-table-search';

type TicketCategory = 'maintenance' | 'security' | 'cleanliness' | 'other';
type TicketStatus = 'open' | 'in_progress' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';

type TicketRow = {
    id: number;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority | null;
    status: TicketStatus;
    source: 'web' | 'whatsapp_ai';
    createdAt: string;
    lastActivityAt: string;
    reporter: { id: number; name: string };
    unit: { id: number; label: string };
    assignedTo: { id: number; name: string } | null;
};

type Props = {
    tickets: TicketRow[];
};

const categoryMeta: Record<TicketCategory, { label: string; icon: typeof Wrench; className: string }> = {
    maintenance: { label: 'Perbaikan', icon: Wrench, className: 'bg-amber-100 text-amber-600' },
    security: { label: 'Keamanan', icon: ShieldAlert, className: 'bg-red-100 text-red-600' },
    cleanliness: { label: 'Kebersihan', icon: Sparkles, className: 'bg-(--color-mint)/12 text-(--color-mint-deep)' },
    other: { label: 'Lainnya', icon: MessageSquare, className: 'bg-(--color-ink)/8 text-(--color-ink)/60' },
};

const statusMeta: Record<TicketStatus, { label: string; className: string }> = {
    open: { label: 'Terbuka', className: 'bg-(--color-sky)/15 text-(--color-sky-deep)' },
    in_progress: { label: 'Diproses', className: 'bg-amber-100 text-amber-600' },
    closed: { label: 'Selesai', className: 'bg-(--color-ink)/8 text-(--color-ink)/50' },
};

const priorityMeta: Record<'none' | TicketPriority, { label: string; className: string }> = {
    none: { label: 'Belum diatur', className: 'bg-(--color-ink)/6 text-(--color-ink)/45' },
    low: { label: 'Rendah', className: 'bg-(--color-mint)/12 text-(--color-mint-deep)' },
    medium: { label: 'Sedang', className: 'bg-amber-100 text-amber-600' },
    high: { label: 'Tinggi', className: 'bg-(--color-coral)/12 text-(--color-coral)' },
};

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function matches(row: TicketRow, q: string) {
    return (
        row.subject.toLowerCase().includes(q) ||
        row.reporter.name.toLowerCase().includes(q) ||
        row.unit.label.toLowerCase().includes(q)
    );
}

export default function AdminTicketsIndex({ tickets }: Props) {
    const [tab, setTab] = useState<'open' | 'closed'>('open');

    const rows = useMemo(
        () => (tab === 'open' ? tickets.filter((t) => t.status !== 'closed') : tickets.filter((t) => t.status === 'closed')),
        [tickets, tab],
    );

    const { search, setSearch, page, setPage, pageCount, paginated } = useTableSearch(rows, matches);

    const openCount = useMemo(() => tickets.filter((t) => t.status !== 'closed').length, [tickets]);

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Tiket & Komplain" />

            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Tiket &amp; Komplain
                </p>
            </div>

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Tiket &amp; Komplain
                </h1>
            </div>

            <p className="text-sm text-(--color-ink)/50">
                Laporan dari penghuni, baik lewat aplikasi maupun WhatsApp. Balas untuk memperbarui status.
            </p>

            <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1">
                    <TabButton active={tab === 'open'} onClick={() => setTab('open')} label={`Aktif (${openCount})`} />
                    <TabButton active={tab === 'closed'} onClick={() => setTab('closed')} label="Selesai" />
                </div>

                <Input
                    placeholder="Cari subjek, pelapor, atau unit..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
            </div>

            <div className="overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Subjek</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Pelapor</TableHead>
                            <TableHead>Prioritas</TableHead>
                            <TableHead>Ditugaskan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Terakhir</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center text-sm text-(--color-ink)/45">
                                    Belum ada tiket.
                                </TableCell>
                            </TableRow>
                        )}

                        {paginated.map((ticket) => {
                            const category = categoryMeta[ticket.category];
                            const status = statusMeta[ticket.status];
                            const priority = priorityMeta[ticket.priority ?? 'none'];
                            const CategoryIcon = category.icon;

                            return (
                                <TableRow key={ticket.id} className="cursor-pointer">
                                    <TableCell>
                                        <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-(--color-ink)">
                                            {ticket.subject}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${category.className}`}
                                        >
                                            <CategoryIcon className="h-3.5 w-3.5" />
                                            {category.label}
                                        </span>
                                    </TableCell>
                                    <TableCell>{ticket.unit.label}</TableCell>
                                    <TableCell>{ticket.reporter.name}</TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.className}`}>
                                            {priority.label}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-(--color-ink)/60">{ticket.assignedTo?.name ?? '—'}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-1 text-xs text-(--color-ink)/45">
                                            <Clock className="h-3 w-3" />
                                            {formatDateTime(ticket.lastActivityAt)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active ? 'bg-(--color-ink) text-(--color-surface)' : 'bg-(--color-ink)/6 text-(--color-ink)/60'
            }`}
        >
            {label}
        </button>
    );
}
