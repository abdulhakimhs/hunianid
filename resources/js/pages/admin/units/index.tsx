import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Eye,
    Loader2,
    Plus,
    Search,
    Users,
    SquarePen,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import type { Unit, User } from '@/types';

type Props = {
    units: Unit[];
    user: User;
};

type SortKey = 'unitNumber' | 'createdAt';
type SortDir = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active';

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

export default function UnitsIndex({ units, user }: Props) {
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('unitNumber');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [detail, setDetail] = useState<Unit | null>(null);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [formData, setFormData] = useState({
        unit_number: '',
        block: '',
        status: 'active',
    });
    console.log('user', user);
    const [submitting, setSubmitting] = useState(false);

    function resetForm() {
        setFormData({
            unit_number: '',
            block: '',
            status: 'active',
        });
    }

    function openEditDialog(unit: Unit) {
        setEditingUnit(unit);

        setFormData({
            unit_number: unit.unit_number,
            block: unit.block ?? '',
            status: unit.status,
        });
    }

    const stats = useMemo(() => {
        const active = units.filter((m) => m.status == 'active').length;

        return {
            total: units.length,
            active,
        };
    }, [units]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = units;

        if (activeFilter === 'active') {
            rows = rows.filter((m) => m.status == 'active');
        }

        if (q) {
            rows = rows.filter((m) =>
                m.normalized_address.toLowerCase().includes(q),
            );
        }

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === 'unitNumber') {
                return a.unit_number.localeCompare(b.unit_number);
            }

            return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        });

        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [units, query, activeFilter, sortKey, sortDir]);

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

    const FILTERS: { key: ActiveFilter; label: string; count: number }[] = [
        { key: 'all', label: 'Semua', count: stats.total },
        { key: 'active', label: 'Aktif', count: stats.active },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Unit" />
            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Unit
                </p>
            </div>
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Units in {user.last_membership?.area?.complex?.name}-
                    {user.last_membership?.area?.name}
                </h1>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Tambah Unit
                </Button>
            </div>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setActiveFilter(f.key)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    activeFilter === f.key
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
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari unit..."
                            className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                        />
                    </div>
                </div>

                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                            <TableHead className="h-8 w-16 pl-4">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('unitNumber')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Unit Number {sortIcon('unitNumber')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-20 text-[11px] font-medium text-(--color-ink)/40">
                                Blok
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
                                    Created at {sortIcon('createdAt')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-12 pr-4" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((m) => {
                            return (
                                <TableRow
                                    key={m.id}
                                    className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                                >
                                    <TableCell className="py-2">
                                        <span className="text(--color-ink)/55 text-sm">
                                            {m.unit_number}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text(--color-ink)/55 text-sm">
                                            {m.block ?? '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text(--color-ink)/55 text-sm">
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
                                        <div className="flex justify-end gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => setDetail(m)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />{' '}
                                                Detail
                                            </Button>

                                            <Button
                                                size="sm"
                                                className="h-7 bg-(--color-mint) px-2.5 text-xs text-white hover:bg-(--color-mint-deep)"
                                                onClick={() =>
                                                    openEditDialog(m)
                                                }
                                            >
                                                <SquarePen className="h-3.5 w-3.5" />{' '}
                                                Edit
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
                            {units.length === 0
                                ? 'Belum ada unit terdaftar.'
                                : 'Tidak ada unit yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}
            </section>

            {/* Create unit dialog */}
            <Dialog
                open={showCreateDialog || !!editingUnit}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setEditingUnit(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingUnit ? 'Edit Unit' : 'Tambah Unit'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingUnit
                                ? 'Perbarui informasi unit.'
                                : 'Masukkan informasi unit baru untuk menambahkannya ke kompleks.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Nomor Unit
                            </label>
                            <Input
                                type="text"
                                value={formData.unit_number}
                                placeholder="Contoh: A-101"
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        unit_number: e.target.value,
                                    })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Blok
                            </label>
                            <Input
                                type="text"
                                value={formData.block}
                                placeholder="Contoh: A"
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        block: e.target.value,
                                    })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Status
                            </label>
                            <Select
                                value={formData.status}
                                onValueChange={(v) =>
                                    setFormData({
                                        ...formData,
                                        status: v,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        Aktif
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Tidak Aktif
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setEditingUnit(null);
                                resetForm();
                            }}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button
                            disabled={!formData.unit_number || submitting}
                            onClick={() => {
                                setSubmitting(true);

                                const options = {
                                    onSuccess: () => {
                                        setShowCreateDialog(false);
                                        setEditingUnit(null);
                                        resetForm();
                                    },
                                    onFinish: () => {
                                        setSubmitting(false);
                                    },
                                };

                                if (editingUnit) {
                                    router.put(
                                        `/admin/units/${editingUnit.id}`,
                                        formData,
                                        options,
                                    );
                                } else {
                                    router.post(
                                        '/admin/units',
                                        formData,
                                        options,
                                    );
                                }
                            }}
                        >
                            {submitting && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}

                            {editingUnit ? 'Simpan Perubahan' : 'Buat Unit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail modal */}
            <Dialog
                open={!!detail}
                onOpenChange={(open) => !open && setDetail(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Unit</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap unit {detail?.unit_number}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Nomor Unit
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.unit_number ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Blok
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.block ?? '—'}
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

                        <Button
                            onClick={() => {
                                if (!detail) {
                                    return;
                                }

                                setDetail(null);
                                openEditDialog(detail);
                            }}
                        >
                            <SquarePen className="h-3.5 w-3.5" />
                            Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
