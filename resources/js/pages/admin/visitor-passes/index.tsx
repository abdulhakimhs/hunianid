import { Head } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Area, VisitorPassAdmin } from '@/types';

type Props = {
    passes: VisitorPassAdmin[];
    area: Area;
};

type SortKey = 'guestName' | 'createdAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'used' | 'expired' | 'cancelled';

const STATUS_LABEL: Record<VisitorPassAdmin['status'], string> = {
    pending: 'Berlaku',
    used: 'Sudah Masuk',
    expired: 'Kedaluwarsa',
    cancelled: 'Dibatalkan',
};

const STATUS_BADGE_CLASS: Record<VisitorPassAdmin['status'], string> = {
    pending: 'bg-(--color-sky)/12 text-(--color-sky-deep)',
    used: 'bg-(--color-mint)/12 text-(--color-mint-deep)',
    expired: 'bg-(--color-ink)/6 text-(--color-ink)/50',
    cancelled: 'bg-(--color-coral)/12 text-(--color-coral)',
};

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function VisitorPassesIndex({ passes, area }: Props) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const stats = useMemo(() => {
        return {
            total: passes.length,
            pending: passes.filter((p) => p.status === 'pending').length,
            used: passes.filter((p) => p.status === 'used').length,
            expired: passes.filter((p) => p.status === 'expired').length,
            cancelled: passes.filter((p) => p.status === 'cancelled').length,
        };
    }, [passes]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = passes;

        if (statusFilter !== 'all') {
            rows = rows.filter((p) => p.status === statusFilter);
        }

        if (q) {
            rows = rows.filter(
                (p) =>
                    p.guestName.toLowerCase().includes(q) ||
                    (p.guestPhone ?? '').toLowerCase().includes(q) ||
                    p.unit.toLowerCase().includes(q) ||
                    p.resident.toLowerCase().includes(q),
            );
        }

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === 'guestName') {
                return a.guestName.localeCompare(b.guestName);
            }

            return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
        });

        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [passes, query, statusFilter, sortKey, sortDir]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    function handleQueryChange(next: string) {
        setQuery(next);
        setPage(1);
    }

    function handleStatusFilterChange(next: StatusFilter) {
        setStatusFilter(next);
        setPage(1);
    }

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

            return;
        }

        setSortKey(key);
        setSortDir('asc');
    }

    function sortIcon(key: SortKey) {
        if (sortKey !== key) {
            return <ArrowUpDown className="h-3 w-3 text-(--color-ink)/25" />;
        }

        return sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-(--color-sky-deep)" />
        ) : (
            <ArrowDown className="h-3 w-3 text-(--color-sky-deep)" />
        );
    }

    const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
        { key: 'pending', label: 'Berlaku', count: stats.pending },
        { key: 'used', label: 'Sudah Masuk', count: stats.used },
        { key: 'expired', label: 'Kedaluwarsa', count: stats.expired },
        { key: 'cancelled', label: 'Dibatalkan', count: stats.cancelled },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Pengunjung" />
            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Pengunjung
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Pass Pengunjung di {area.complex?.name}-{area.name}
                </h1>
            </div>

            <p className="-mt-2 text-sm text-(--color-ink)/55">
                Pass dibuat warga lewat chat WhatsApp AI
            </p>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => handleStatusFilterChange(f.key)}
                                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    statusFilter === f.key
                                        ? 'bg-(--color-surface) text-(--color-ink) shadow-sm'
                                        : 'text-(--color-ink)/50 hover:text-(--color-ink)/80'
                                }`}
                            >
                                {f.label}{' '}
                                <span className="tabular-nums opacity-60">
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            placeholder="Cari nama tamu, unit, atau warga..."
                            className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                        />
                    </div>
                </div>

                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                            <TableHead className="h-8 pl-4">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('guestName')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Tamu {sortIcon('guestName')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-32 text-[11px] font-medium text-(--color-ink)/40">
                                Kendaraan
                            </TableHead>
                            <TableHead className="h-8 w-28 text-[11px] font-medium text-(--color-ink)/40">
                                Unit
                            </TableHead>
                            <TableHead className="h-8 w-36 text-[11px] font-medium text-(--color-ink)/40">
                                Dibuat oleh
                            </TableHead>
                            <TableHead className="h-8 w-28 text-[11px] font-medium text-(--color-ink)/40">
                                Status
                            </TableHead>
                            <TableHead className="h-8 w-36">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('createdAt')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Dibuat {sortIcon('createdAt')}
                                </button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((p) => (
                            <TableRow
                                key={p.id}
                                className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                            >
                                <TableCell className="py-2 pl-4">
                                    <span className="block text-sm font-medium text-(--color-ink)">
                                        {p.guestName}
                                    </span>
                                    <span className="block text-xs text-(--color-ink)/45">
                                        {p.guestPhone ?? '—'}{p.purpose ? ` · ${p.purpose}` : ''}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-sm text-(--color-ink)/55">
                                        {p.vehicleInfo ?? '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-sm text-(--color-ink)/55">
                                        {p.unit}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-sm text-(--color-ink)/55">
                                        {p.resident}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[p.status]}`}
                                    >
                                        {STATUS_LABEL[p.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-xs text-(--color-ink)/45">
                                        {formatDateTime(p.createdAt)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                            <Users className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {passes.length === 0
                                ? 'Belum ada pass pengunjung yang dibuat warga.'
                                : 'Tidak ada pass yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}

                <DataTablePagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </section>
        </div>
    );
}
