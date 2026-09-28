import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Eye,
    Loader2,
    Plus,
    Search,
    Send,
    ShieldCheck,
    SquarePen,
    Trash2,
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

import type { Area, SecurityGuard } from '@/types';

type Props = {
    guards: SecurityGuard[];
    area: Area;
};

type SortKey = 'name' | 'createdAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'suspended';

function formatDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function SecurityIndex({ guards, area }: Props) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    const [detail, setDetail] = useState<SecurityGuard | null>(null);
    const [editingGuard, setEditingGuard] = useState<SecurityGuard | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [deletingGuard, setDeletingGuard] = useState<SecurityGuard | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const [createForm, setCreateForm] = useState({ name: '', phone: '', email: '' });
    const [editForm, setEditForm] = useState({ name: '', email: '', status: 'active' });
    const [submitting, setSubmitting] = useState(false);

    const stats = useMemo(() => {
        const active = guards.filter((g) => g.status === 'active').length;
        const suspended = guards.filter((g) => g.status === 'suspended').length;

        return { total: guards.length, active, suspended };
    }, [guards]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        let rows = guards;

        if (statusFilter !== 'all') {
            rows = rows.filter((g) => g.status === statusFilter);
        }

        if (q) {
            rows = rows.filter(
                (g) =>
                    g.name.toLowerCase().includes(q) ||
                    g.phone.toLowerCase().includes(q),
            );
        }

        const sorted = [...rows].sort((a, b) => {
            if (sortKey === 'name') {
                return a.name.localeCompare(b.name);
            }

            return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        });

        return sortDir === 'asc' ? sorted : sorted.reverse();
    }, [guards, query, statusFilter, sortKey, sortDir]);

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
        { key: 'active', label: 'Aktif', count: stats.active },
        { key: 'suspended', label: 'Nonaktif', count: stats.suspended },
    ];

    function openEditDialog(guard: SecurityGuard) {
        setEditingGuard(guard);
        setEditForm({
            name: guard.name,
            email: guard.email ?? '',
            status: guard.status,
        });
    }

    function confirmDelete() {
        if (!deletingGuard) {
            return;
        }

        setDeletingBusy(true);

        router.delete(`/admin/security/${deletingGuard.id}`, {
            onSuccess: () => setDeletingGuard(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Security" />
            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Security
                </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Security di {area.complex?.name}-{area.name}
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/admin/security/invites">
                            <Send className="h-4 w-4" />
                            Undangan Security
                        </Link>
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4" />
                        Tambah Security
                    </Button>
                </div>
            </div>

            <p className="-mt-2 text-sm text-(--color-ink)/55">
                Data Security bisa diisi dulu di sini. Setelah siap, undang
                mereka lewat WhatsApp dari halaman{' '}
                <Link
                    href="/admin/security/invites"
                    className="font-medium text-(--color-sky-deep) underline underline-offset-2"
                >
                    Undangan Security
                </Link>
                .
            </p>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setStatusFilter(f.key)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
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
                                Akun
                            </TableHead>
                            <TableHead className="h-8 w-32 text-[11px] font-medium text-(--color-ink)/40">
                                Kata Sandi
                            </TableHead>
                            <TableHead className="h-8 w-32">
                                <button
                                    type="button"
                                    onClick={() => toggleSort('createdAt')}
                                    className="flex items-center gap-1 text-[11px] font-medium text-(--color-ink)/40"
                                >
                                    Ditambahkan {sortIcon('createdAt')}
                                </button>
                            </TableHead>
                            <TableHead className="h-8 w-28 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((g) => (
                            <TableRow
                                key={g.id}
                                className="hover:bg-(--color-ink)/0.02 border-(--color-ink)/6 transition-colors last:border-0"
                            >
                                <TableCell className="py-2 pl-4">
                                    <span className="text-sm font-medium text-(--color-ink)">
                                        {g.name}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-(--color-ink)/55 text-sm">
                                        {g.phone}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-(--color-ink)/55 text-sm">
                                        {g.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2">
                                    {g.claimed ? (
                                        <span className="inline-flex items-center rounded-full bg-(--color-mint)/12 px-2 py-0.5 text-xs font-medium text-(--color-mint-deep)">
                                            Sudah dibuat
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full bg-(--color-ink)/6 px-2 py-0.5 text-xs font-medium text-(--color-ink)/50">
                                            Belum dibuat
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-xs text-(--color-ink)/45">
                                        {formatDate(g.created_at)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-2 pr-4">
                                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            title="Detail"
                                            onClick={() => setDetail(g)}
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 bg-(--color-mint) text-white hover:bg-(--color-mint-deep)"
                                            title="Edit"
                                            onClick={() => openEditDialog(g)}
                                        >
                                            <SquarePen className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 text-(--color-coral) hover:bg-(--color-coral)/10"
                                            title="Hapus"
                                            onClick={() => setDeletingGuard(g)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                            <ShieldCheck className="h-4.5 w-4.5" />
                        </span>
                        <p className="text-sm text-(--color-ink)/50">
                            {guards.length === 0
                                ? 'Belum ada Security terdaftar.'
                                : 'Tidak ada Security yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}
            </section>

            <Dialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setCreateForm({ name: '', phone: '', email: '' });
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Security</DialogTitle>
                        <DialogDescription>
                             Undang mereka kapan saja lewat
                            halaman Undangan Security.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Nama
                            </label>
                            <Input
                                type="text"
                                value={createForm.name}
                                placeholder="Contoh: Ahmad"
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, name: e.target.value })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                No. WhatsApp
                            </label>
                            <Input
                                type="tel"
                                value={createForm.phone}
                                placeholder="08xxxxxxxxxx"
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, phone: e.target.value })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Email (opsional)
                            </label>
                            <Input
                                type="email"
                                value={createForm.email}
                                placeholder="nama@email.com"
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, email: e.target.value })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setCreateForm({ name: '', phone: '', email: '' });
                            }}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button
                            disabled={!createForm.name || !createForm.phone || submitting}
                            onClick={() => {
                                setSubmitting(true);

                                router.post(
                                    '/admin/security',
                                    createForm,
                                    {
                                        onSuccess: () => {
                                            setShowCreateDialog(false);
                                            setCreateForm({ name: '', phone: '', email: '' });
                                        },
                                        onFinish: () => setSubmitting(false),
                                    },
                                );
                            }}
                        >
                            {submitting && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Simpan Data
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!editingGuard}
                onOpenChange={(open) => !open && setEditingGuard(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Security</DialogTitle>
                        <DialogDescription>
                            Perbarui informasi Security.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Nama
                            </label>
                            <Input
                                type="text"
                                value={editForm.name}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, name: e.target.value })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                No. WhatsApp
                            </label>
                            <Input
                                type="text"
                                value={editingGuard?.phone ?? ''}
                                disabled
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-ink)/5 px-3 py-2 text-sm text-(--color-ink)/50"
                            />
                            <p className="text-xs text-(--color-ink)/40">
                                Nomor WhatsApp tidak dapat diubah di sini.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Email (opsional)
                            </label>
                            <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, email: e.target.value })
                                }
                                className="rounded-lg border border-(--color-ink)/10 bg-(--color-bg) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">
                                Status Akun
                            </label>
                            <Select
                                value={editForm.status}
                                onValueChange={(v) =>
                                    setEditForm({ ...editForm, status: v })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="suspended">
                                        Nonaktif
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingGuard(null)}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button
                            disabled={!editForm.name || submitting}
                            onClick={() => {
                                if (!editingGuard) {
                                    return;
                                }

                                setSubmitting(true);

                                router.put(
                                    `/admin/security/${editingGuard.id}`,
                                    editForm,
                                    {
                                        onSuccess: () => setEditingGuard(null),
                                        onFinish: () => setSubmitting(false),
                                    },
                                );
                            }}
                        >
                            {submitting && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!detail}
                onOpenChange={(open) => !open && setDetail(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Security</DialogTitle>
                        <DialogDescription>
                            Informasi lengkap akun Security.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Nama
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.name ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                No. WhatsApp
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.phone ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Email
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.email ?? '—'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Kata Sandi
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {detail?.claimed ? 'Sudah dibuat oleh Security' : 'Belum dibuat — undang lewat WhatsApp'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-(--color-ink)/8 bg-(--color-bg) px-3.5 py-3">
                            <p className="text-[11px] tracking-wide text-(--color-ink)/45 uppercase">
                                Ditambahkan
                            </p>
                            <p className="font-medium text-(--color-ink)">
                                {formatDate(detail?.created_at)}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        {detail && !detail.claimed && (
                            <Button variant="outline" asChild>
                                <Link href="/admin/security/invites">
                                    <Send className="h-4 w-4" />
                                    Undang Sekarang
                                </Link>
                            </Button>
                        )}
                        <Button onClick={() => setDetail(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!deletingGuard}
                onOpenChange={(open) => !open && setDeletingGuard(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Security</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus akun Security{' '}
                            <span className="font-medium text-(--color-ink)">
                                {deletingGuard?.name}
                            </span>
                            ? Akun pengguna ({deletingGuard?.phone}) tetap ada,
                            hanya perannya sebagai Security di area ini yang
                            dihapus.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingGuard(null)}
                            disabled={deletingBusy}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deletingBusy}
                        >
                            {deletingBusy && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
