import { Head } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Area, Family, UnitOption } from '@/types';

type Props = {
    families: Family[];
    units: UnitOption[];
    area: Area;
};

type SortKey = 'name' | 'createdAt';
type SortDir = 'asc' | 'desc';

function formatDate(
    iso: string | null,
    style: 'long' | 'short' = 'long',
): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: style,
        year: 'numeric',
    });
}

function formatUnit(unit: Family['unit'] | null | undefined): string {
    if (!unit) {
        return '—';
    }

    return unit.block ? `${unit.unit_number} · ${unit.block}` : unit.unit_number;
}

export default function FamiliesIndex({ families, units, area }: Props) {
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [detail, setDetail] = useState<Family | null>(null);

    const stats = useMemo(() => {
        const active = families.filter(
            (m) => m.status == 'active',
        ).length;

        return {
            total: families.length,
            active,
        };
    }, [families]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = families;

        if (q) {
            rows = rows.filter(
                (m) =>
                    m.user.name.toLowerCase().includes(q) ||
                    (m.user.phone ?? '').toLowerCase().includes(q),
            );
        }

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === 'name') {
                return a.user.name.localeCompare(b.user.name);
            }

            return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        });

        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [families, query, sortKey, sortDir]);

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

    const FILTERS: { key: 'all'; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Keluarga" />
            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Keluarga
                </p>
            </div>
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Anggota Keluarga di{' '}
                    {area.complex?.name}-{area.name}
                </h1>
            </div>

            <p className="-mt-2 text-sm text-(--color-ink)/55">
                Data ini dikelola sendiri oleh masing-masing penghuni di
                unitnya. Anda hanya bisa melihat, bukan menambah, mengubah,
                atau menghapus.
            </p>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-(--color-ink) shadow-sm"
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
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama atau nomor WA..."
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
                                    onClick={() => toggleSort('name')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Nama {sortIcon('name')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-40 text-[11px] font-medium text-(--color-ink)/40">
                                No. WhatsApp
                            </TableHead>
                            <TableHead className="h-8 w-28 text-[11px] font-medium text-(--color-ink)/40">
                                Unit
                            </TableHead>
                            <TableHead className="h-8 w-24 text-[11px] font-medium text-(--color-ink)/40">
                                Status
                            </TableHead>
                            <TableHead className="h-8 w-32">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('createdAt')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Dibuat {sortIcon('createdAt')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-16 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((m) => {
                            return (
                                <TableRow
                                    key={m.id}
                                    className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                                >
                                    <TableCell className="py-2 pl-4">
                                        <span className="text-sm font-medium text-(--color-ink)">
                                            {m.user.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-(--color-ink)/55 text-sm">
                                            {m.user.phone ?? '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-(--color-ink)/55 text-sm">
                                            {formatUnit(m.unit)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-(--color-ink)/55 text-sm">
                                            {m.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-xs text-(--color-ink)/45">
                                            {formatDate(
                                                m.created_at ?? null,
                                                'short',
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4">
                                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                title="Detail"
                                                onClick={() => setDetail(m)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                            <Users className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {families.length === 0
                                ? units.length === 0
                                    ? 'Belum ada unit.'
                                    : 'Belum ada anggota keluarga terdaftar.'
                                : 'Tidak ada anggota yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}
            </section>

            <Dialog
                open={!!detail}
                onOpenChange={(open) => !open && setDetail(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Anggota Keluarga</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap anggota keluarga.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Nama
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.user.name ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                No. WhatsApp
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.user.phone ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Unit
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {formatUnit(detail?.unit)}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Status
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.status ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Dibuat
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {formatDate(detail?.created_at ?? null)}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDetail(null)}
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
