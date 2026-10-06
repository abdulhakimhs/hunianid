import { Head, router } from '@inertiajs/react';
import { Loader2, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useTableSearch } from '@/hooks/use-table-search';

type InvoiceCategoryRow = {
    id: number;
    name: string;
    defaultAmount: number | null;
    isActive: boolean;
};

type Props = {
    categories: InvoiceCategoryRow[];
};

function formatCurrency(amount: number | null) {
    if (amount === null) {
return '—';
}

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function InvoiceCategoriesIndex({ categories }: Props) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<InvoiceCategoryRow | null>(null);
    const [formData, setFormData] = useState({ name: '', default_amount: '' });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [deletingCategory, setDeletingCategory] = useState<InvoiceCategoryRow | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);

    const { search, setSearch, page, setPage, pageCount, paginated, filtered } = useTableSearch(
        categories,
        (c, q) => c.name.toLowerCase().includes(q),
    );

    function resetForm() {
        setFormData({ name: '', default_amount: '' });
        setErrors({});
    }

    function openEditDialog(category: InvoiceCategoryRow) {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            default_amount: category.defaultAmount !== null ? String(category.defaultAmount) : '',
        });
    }

    function submitForm() {
        setSubmitting(true);

        const payload = {
            name: formData.name,
            default_amount: formData.default_amount || null,
        };

        const options = {
            onSuccess: () => {
                setShowCreateDialog(false);
                setEditingCategory(null);
                resetForm();
            },
            onError: setErrors,
            onFinish: () => setSubmitting(false),
        };

        if (editingCategory) {
            router.put(`/admin/invoice-categories/${editingCategory.id}`, payload, options);
        } else {
            router.post('/admin/invoice-categories', payload, options);
        }
    }

    function toggleActive(category: InvoiceCategoryRow) {
        router.put(`/admin/invoice-categories/${category.id}`, { is_active: !category.isActive });
    }

    function confirmDelete() {
        if (!deletingCategory) {
return;
}

        setDeletingBusy(true);

        router.delete(`/admin/invoice-categories/${deletingCategory.id}`, {
            onSuccess: () => setDeletingCategory(null),
            onFinish: () => setDeletingBusy(false),
        });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Kategori Tagihan" />

            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Kategori Tagihan
                </p>
            </div>

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Kategori Tagihan
                </h1>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Tambah Kategori
                </Button>
            </div>

            <p className="text-sm text-(--color-ink)/50">
                Kategori ini muncul di pilihan saat membuat tagihan. Harga bawaan otomatis mengisi nominal tagihan,
                tapi tetap bisa diubah.
            </p>

            <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                <div className="flex items-center justify-between border-b border-(--color-ink)/8 px-4 py-3">
                    <p className="text-sm font-medium text-(--color-ink)">Daftar Kategori</p>
                    <div className="relative w-full sm:w-56">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari kategori..."
                            className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                        />
                    </div>
                </div>
                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                            <TableHead className="h-8 pl-4 text-[11px] font-medium text-(--color-ink)/40">Nama</TableHead>
                            <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Harga Bawaan</TableHead>
                            <TableHead className="h-8 w-28 text-[11px] font-medium text-(--color-ink)/40">Status</TableHead>
                            <TableHead className="h-8 w-32 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map((category) => (
                            <TableRow key={category.id} className="border-(--color-ink)/6 last:border-0">
                                <TableCell className="py-2 pl-4">
                                    <span className="text-sm text-(--color-ink)">{category.name}</span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-sm text-(--color-ink)/70">{formatCurrency(category.defaultAmount)}</span>
                                </TableCell>
                                <TableCell className="py-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleActive(category)}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                            category.isActive
                                                ? 'bg-(--color-mint)/12 text-(--color-mint-deep)'
                                                : 'bg-(--color-ink)/8 text-(--color-ink)/50'
                                        }`}
                                    >
                                        {category.isActive ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                </TableCell>
                                <TableCell className="py-2 pr-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 bg-(--color-mint) text-white hover:bg-(--color-mint-deep)"
                                            title="Edit"
                                            onClick={() => openEditDialog(category)}
                                        >
                                            <SquarePen className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 text-(--color-coral) hover:bg-(--color-coral)/10"
                                            title="Hapus"
                                            onClick={() => setDeletingCategory(category)}
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
                        <p className="text-sm text-(--color-ink)/50">
                            {categories.length === 0
                                ? 'Belum ada kategori tagihan. Tambahkan dulu sebelum membuat tagihan.'
                                : 'Tidak ada kategori yang cocok dengan pencarian.'}
                        </p>
                    </div>
                )}

                <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </section>

            {/* Create/edit dialog */}
            <Dialog
                open={showCreateDialog || !!editingCategory}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setEditingCategory(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? 'Perbarui nama atau harga bawaan kategori ini.'
                                : 'Buat kategori tagihan baru, misalnya "IPL Perumahan" atau "Biaya Parkir".'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Nama Kategori</label>
                            <Input
                                value={formData.name}
                                placeholder="Contoh: IPL Perumahan"
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            {errors.name && <p className="text-sm text-(--color-coral)">{errors.name}</p>}
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Harga Bawaan (opsional)</label>
                            <CurrencyInput
                                value={formData.default_amount}
                                onValueChange={(v) => setFormData({ ...formData, default_amount: v })}
                            />
                            {errors.default_amount && <p className="text-sm text-(--color-coral)">{errors.default_amount}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setEditingCategory(null);
                                resetForm();
                            }}
                            disabled={submitting}
                        >
                            Batal
                        </Button>
                        <Button disabled={!formData.name || submitting} onClick={submitForm}>
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Kategori</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus kategori{' '}
                            <span className="font-medium text-(--color-ink)">{deletingCategory?.name}</span>?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingCategory(null)} disabled={deletingBusy}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deletingBusy}>
                            {deletingBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
