import { Head, Link, router } from '@inertiajs/react';
import { Ban, CircleCheck, ListFilter, Loader2, Plus, Repeat, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import { useTableSearch } from '@/hooks/use-table-search';

type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'cancelled';
type InvoiceCategoryRef = { id: number; name: string };
type InvoiceCategoryOption = { id: number; name: string; defaultAmount: number | null };

type InvoiceRow = {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    amount: number;
    status: InvoiceStatus;
    memo: string | null;
    invoiceCategory: InvoiceCategoryRef;
    tenant: { id: number; name: string };
    unit: { id: number; label: string };
};

type TemplateRow = {
    id: number;
    title: string;
    amount: number;
    invoiceCategory: InvoiceCategoryRef;
    memo: string | null;
    dayOfMonth: number;
    dueInDays: number;
    nextRunDate: string;
    isActive: boolean;
    invoicesCount: number;
};

type Props = {
    invoices: InvoiceRow[];
    templates: TemplateRow[];
    categories: InvoiceCategoryOption[];
    reminderDaysBeforeDue: number;
};

const statusMeta: Record<InvoiceStatus, { label: string; className: string }> = {
    unpaid: { label: 'Belum Dibayar', className: 'bg-amber-100 text-amber-600' },
    overdue: { label: 'Jatuh Tempo', className: 'bg-red-100 text-red-600' },
    paid: { label: 'Lunas', className: 'bg-(--color-mint)/12 text-(--color-mint-deep)' },
    cancelled: { label: 'Dibatalkan', className: 'bg-(--color-ink)/8 text-(--color-ink)/50' },
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(date: string | null) {
    if (!date) {
return '-';
}

    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initialTab(): 'outstanding' | 'history' | 'templates' {
    if (typeof window === 'undefined') {
return 'outstanding';
}

    const tab = new URLSearchParams(window.location.search).get('tab');

    return tab === 'history' || tab === 'templates' ? tab : 'outstanding';
}

type PeriodFilter = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year';

const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'all', label: 'Semua Periode' },
    { value: 'this_month', label: 'Bulan Ini' },
    { value: 'last_month', label: 'Bulan Lalu' },
    { value: 'last_3_months', label: '3 Bulan Terakhir' },
    { value: 'this_year', label: 'Tahun Ini' },
];

function matchesPeriod(invoiceDateIso: string, period: PeriodFilter): boolean {
    if (period === 'all') {
        return true;
    }

    const d = new Date(invoiceDateIso);
    const now = new Date();

    if (period === 'this_month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    if (period === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
    }

    if (period === 'last_3_months') {
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        return d >= cutoff;
    }

    return d.getFullYear() === now.getFullYear();
}

const outstandingStatusFilters: { key: 'all' | InvoiceStatus; label: string }[] = [
    { key: 'all', label: 'Semua Status' },
    { key: 'unpaid', label: 'Belum Dibayar' },
    { key: 'overdue', label: 'Jatuh Tempo' },
];

const historyStatusFilters: { key: 'all' | InvoiceStatus; label: string }[] = [
    { key: 'all', label: 'Semua Status' },
    { key: 'paid', label: 'Lunas' },
    { key: 'cancelled', label: 'Dibatalkan' },
];

export default function InvoicesIndex({ invoices, templates, categories, reminderDaysBeforeDue }: Props) {
    const [tab, setTab] = useState<'outstanding' | 'history' | 'templates'>(initialTab);
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [templateForm, setTemplateForm] = useState({
        title: '',
        amount: '',
        invoice_category_id: categories[0] ? String(categories[0].id) : '',
        memo: '',
        day_of_month: '1',
        due_in_days: '14',
    });
    const [templateSubmitting, setTemplateSubmitting] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<TemplateRow | null>(null);
    const [cancellingInvoice, setCancellingInvoice] = useState<InvoiceRow | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
    const [bulkCancelling, setBulkCancelling] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

    const outstanding = useMemo(
        () => invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue'),
        [invoices],
    );
    const history = useMemo(
        () => invoices.filter((inv) => inv.status === 'paid' || inv.status === 'cancelled'),
        [invoices],
    );

    const list = tab === 'outstanding' ? outstanding : history;
    const statusFilters = tab === 'outstanding' ? outstandingStatusFilters : historyStatusFilters;

    const filteredList = useMemo(
        () =>
            list.filter(
                (inv) =>
                    (statusFilter === 'all' || inv.status === statusFilter) &&
                    (categoryFilter === 'all' || String(inv.invoiceCategory.id) === categoryFilter) &&
                    matchesPeriod(inv.invoiceDate, periodFilter),
            ),
        [list, statusFilter, categoryFilter, periodFilter],
    );

    const filtersActive = statusFilter !== 'all' || categoryFilter !== 'all' || periodFilter !== 'all';

    function handleTabChange(next: 'outstanding' | 'history' | 'templates') {
        setTab(next);
        setStatusFilter('all');
    }

    const { search, setSearch, page, setPage, pageCount, paginated } = useTableSearch(
        filteredList,
        (inv, q) => `${inv.tenant.name} ${inv.unit.label} ${inv.invoiceCategory.name}`.toLowerCase().includes(q),
    );

    function handleStatusFilterChange(next: 'all' | InvoiceStatus) {
        setStatusFilter(next);
        setPage(1);
    }

    function handleCategoryFilterChange(next: string) {
        setCategoryFilter(next);
        setPage(1);
    }

    function handlePeriodFilterChange(next: PeriodFilter) {
        setPeriodFilter(next);
        setPage(1);
    }

    function resetFilters() {
        setStatusFilter('all');
        setCategoryFilter('all');
        setPeriodFilter('all');
        setPage(1);
    }

    const selectableIds = useMemo(
        () => paginated.filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue').map((inv) => inv.id),
        [paginated],
    );
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

    function toggleSelected(id: number) {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        if (allSelected) {
            setSelected((prev) => prev.filter((id) => !selectableIds.includes(id)));
        } else {
            setSelected((prev) => Array.from(new Set([...prev, ...selectableIds])));
        }
    }

    function markPaid(invoice: InvoiceRow) {
        router.post(`/admin/invoices/${invoice.id}/mark-paid`, {});
    }

    function confirmCancelInvoice() {
        if (!cancellingInvoice) {
            return;
        }

        setCancelling(true);

        router.post(
            `/admin/invoices/${cancellingInvoice.id}/cancel`,
            {},
            {
                onSuccess: () => setCancellingInvoice(null),
                onFinish: () => setCancelling(false),
            },
        );
    }

    function markPaidBulk() {
        setBulkSubmitting(true);
        router.post(
            '/admin/invoices/mark-paid-bulk',
            { invoice_ids: selected },
            {
                onSuccess: () => setSelected([]),
                onFinish: () => setBulkSubmitting(false),
            },
        );
    }

    function confirmCancelBulk() {
        setBulkCancelling(true);
        router.post(
            '/admin/invoices/cancel-bulk',
            { invoice_ids: selected },
            {
                onSuccess: () => {
                    setSelected([]);
                    setBulkCancelOpen(false);
                },
                onFinish: () => setBulkCancelling(false),
            },
        );
    }

    function selectTemplateCategory(id: string) {
        const category = categories.find((c) => String(c.id) === id);
        setTemplateForm((prev) => ({
            ...prev,
            invoice_category_id: id,
            amount: category?.defaultAmount !== null && category?.defaultAmount !== undefined
                ? String(category.defaultAmount)
                : prev.amount,
        }));
    }

    function createTemplate() {
        setTemplateSubmitting(true);
        router.post(
            '/admin/invoice-templates',
            templateForm,
            {
                onSuccess: () => {
                    setShowTemplateDialog(false);
                    setTemplateForm({
                        title: '',
                        amount: '',
                        invoice_category_id: categories[0] ? String(categories[0].id) : '',
                        memo: '',
                        day_of_month: '1',
                        due_in_days: '14',
                    });
                },
                onFinish: () => setTemplateSubmitting(false),
            },
        );
    }

    function toggleTemplateActive(template: TemplateRow) {
        router.put(`/admin/invoice-templates/${template.id}`, { is_active: !template.isActive });
    }

    function confirmDeleteTemplate() {
        if (!deletingTemplate) {
return;
}

        router.delete(`/admin/invoice-templates/${deletingTemplate.id}`, {
            onSuccess: () => setDeletingTemplate(null),
        });
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Tagihan" />

            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Tagihan
                </p>
            </div>

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Tagihan
                </h1>
                <Link href="/admin/invoices/create">
                    <Button>
                        <Plus className="h-4 w-4" />
                        Buat Tagihan
                    </Button>
                </Link>
            </div>

            <p className="text-sm text-(--color-ink)/50">
                Pengingat WhatsApp otomatis terkirim {reminderDaysBeforeDue} hari sebelum jatuh tempo. Ubah di halaman
                Pengaturan.
            </p>

            <div className="flex gap-1">
                <TabButton active={tab === 'outstanding'} onClick={() => handleTabChange('outstanding')} label={`Belum Dibayar (${outstanding.length})`} />
                <TabButton active={tab === 'history'} onClick={() => handleTabChange('history')} label="Riwayat" />
                <TabButton active={tab === 'templates'} onClick={() => handleTabChange('templates')} label="Template Berulang" />
            </div>

            {tab !== 'templates' && (
                <section className="shadow-elevated overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                    <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-(--color-ink)">Daftar Tagihan</p>
                            <div className="relative w-full sm:w-64">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari penghuni, unit, kategori..."
                                    className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="flex items-center gap-1.5 text-(--color-ink)/35">
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-medium tracking-wide uppercase">Filter</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-(--color-bg) p-1">
                                {statusFilters.map((f) => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => handleStatusFilterChange(f.key)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                            statusFilter === f.key
                                                ? 'bg-(--color-surface) text-(--color-ink) shadow-sm'
                                                : 'text-(--color-ink)/50 hover:text-(--color-ink)/80'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                                <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                                    <SelectValue placeholder="Kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={periodFilter} onValueChange={(v) => handlePeriodFilterChange(v as PeriodFilter)}>
                                <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                                    <SelectValue placeholder="Periode" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periodOptions.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {filtersActive && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="flex items-center gap-1 text-xs font-medium text-(--color-coral) hover:text-(--color-coral)/80"
                                >
                                    <X className="h-3 w-3" />
                                    Reset Filter
                                </button>
                            )}
                        </div>
                    </div>
                    <Table className="w-full table-fixed">
                        <TableHeader>
                            <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                                <TableHead className="h-8 w-10 pl-4">
                                    {tab === 'outstanding' && selectableIds.length > 0 && (
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label={allSelected ? 'Batalkan semua' : 'Pilih semua'}
                                        />
                                    )}
                                </TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Penghuni</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Kategori</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Nominal</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Jatuh Tempo</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Status</TableHead>
                                <TableHead className="h-8 w-52 pr-4 text-right text-[11px] font-medium text-(--color-ink)/40">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map((invoice) => (
                                <TableRow key={invoice.id} className="border-(--color-ink)/6 last:border-0">
                                    <TableCell className="py-2 pl-4">
                                        {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                                            <Checkbox
                                                checked={selected.includes(invoice.id)}
                                                onCheckedChange={() => toggleSelected(invoice.id)}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <p className="text-sm text-(--color-ink)">{invoice.tenant.name}</p>
                                        <p className="text-xs text-(--color-ink)/45">{invoice.unit.label}</p>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm text-(--color-ink)/70">{invoice.invoiceCategory.name}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm font-semibold text-(--color-ink)">{formatCurrency(invoice.amount)}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-xs text-(--color-ink)/50">{formatDate(invoice.dueDate)}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusMeta[invoice.status].className}`}>
                                            {statusMeta[invoice.status].label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 pr-4 text-right">
                                        {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="h-8 gap-1.5 rounded-full bg-(--color-mint) px-3 text-white shadow-sm hover:bg-(--color-mint-deep)"
                                                    onClick={() => markPaid(invoice)}
                                                >
                                                    <CircleCheck className="h-3.5 w-3.5" />
                                                    Lunas
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 gap-1.5 rounded-full px-3 text-(--color-coral) hover:bg-(--color-coral)/10 hover:text-(--color-coral)"
                                                    onClick={() => setCancellingInvoice(invoice)}
                                                >
                                                    <Ban className="h-3.5 w-3.5" />
                                                    Batalkan
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {paginated.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                            <p className="text-sm text-(--color-ink)/50">
                                {list.length === 0
                                    ? tab === 'outstanding'
                                        ? 'Tidak ada tagihan yang belum dibayar.'
                                        : 'Belum ada riwayat tagihan.'
                                    : 'Tidak ada tagihan yang cocok dengan filter/pencarian.'}
                            </p>
                            {filtersActive && list.length > 0 && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-medium text-(--color-sky-deep) underline underline-offset-2"
                                >
                                    Reset filter
                                </button>
                            )}
                        </div>
                    )}

                    <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
                </section>
            )}

            {tab === 'templates' && (
                <section className="flex flex-col gap-3">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                            <Repeat className="h-4 w-4" />
                            Template Baru
                        </Button>
                    </div>

                    {templates.length === 0 && (
                        <p className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) px-5 py-8 text-center text-sm text-(--color-ink)/50">
                            Belum ada template tagihan berulang. Template akan membuat tagihan otomatis untuk semua
                            penghuni aktif di area ini setiap bulan.
                        </p>
                    )}

                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4"
                        >
                            <div>
                                <p className="text-sm font-semibold text-(--color-ink)">{template.title}</p>
                                <p className="text-xs text-(--color-ink)/45">
                                    {formatCurrency(template.amount)} · Setiap tanggal {template.dayOfMonth} · Jatuh tempo{' '}
                                    {template.dueInDays} hari kemudian · {template.invoicesCount} tagihan dibuat
                                </p>
                                <p className="text-xs text-(--color-ink)/40">Berikutnya: {formatDate(template.nextRunDate)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleTemplateActive(template)}
                                >
                                    {template.isActive ? 'Aktif' : 'Nonaktif'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-(--color-coral) hover:bg-(--color-coral)/10"
                                    onClick={() => setDeletingTemplate(template)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {selected.length > 0 && tab === 'outstanding' && (
                <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center">
                    <div className="flex items-center gap-3 rounded-full bg-(--color-ink) px-5 py-3 text-white shadow-elevated">
                        <span className="text-sm">{selected.length} dipilih</span>
                        <Button
                            size="sm"
                            className="gap-1.5 rounded-full bg-(--color-mint) text-white hover:bg-(--color-mint-deep)"
                            disabled={bulkSubmitting || bulkCancelling}
                            onClick={markPaidBulk}
                        >
                            {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />}
                            Tandai Lunas
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 rounded-full text-white hover:bg-white/10 hover:text-white"
                            disabled={bulkSubmitting || bulkCancelling}
                            onClick={() => setBulkCancelOpen(true)}
                        >
                            <Ban className="h-3.5 w-3.5" />
                            Batalkan
                        </Button>
                    </div>
                </div>
            )}

            {/* Bulk cancel confirmation */}
            <Dialog open={bulkCancelOpen} onOpenChange={(open) => !open && setBulkCancelOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan {selected.length} Tagihan</DialogTitle>
                        <DialogDescription>
                            Yakin ingin membatalkan {selected.length} tagihan terpilih? Tagihan akan dipindah ke tab
                            Riwayat dengan status Dibatalkan — bukan hapus permanen, jadi tidak bisa ditagih ulang dari
                            sini.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkCancelOpen(false)} disabled={bulkCancelling}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmCancelBulk} disabled={bulkCancelling}>
                            {bulkCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                            Batalkan Tagihan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create template dialog */}
            <Dialog open={showTemplateDialog} onOpenChange={(open) => !open && setShowTemplateDialog(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Template Tagihan Berulang</DialogTitle>
                        <DialogDescription>
                            Tagihan akan dibuat otomatis setiap bulan untuk semua penghuni aktif di area ini — bukan
                            daftar penghuni yang tetap, tapi dihitung ulang setiap kali dibuat.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Judul</label>
                            <Input
                                value={templateForm.title}
                                placeholder="Contoh: IPL Perumahan"
                                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Nominal</label>
                            <CurrencyInput
                                value={templateForm.amount}
                                onValueChange={(v) => setTemplateForm({ ...templateForm, amount: v })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Kategori</label>
                            {categories.length === 0 ? (
                                <p className="text-sm text-(--color-ink)/50">
                                    Belum ada kategori tagihan.{' '}
                                    <a href="/admin/invoice-categories" className="text-(--color-sky-deep) underline">
                                        Buat kategori dulu
                                    </a>
                                    .
                                </p>
                            ) : (
                                <Select value={templateForm.invoice_category_id} onValueChange={selectTemplateCategory}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-(--color-ink)">Tanggal dibuat</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={templateForm.day_of_month}
                                    onChange={(e) => setTemplateForm({ ...templateForm, day_of_month: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-(--color-ink)">Jatuh tempo (hari)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={templateForm.due_in_days}
                                    onChange={(e) => setTemplateForm({ ...templateForm, due_in_days: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-(--color-ink)">Catatan (opsional)</label>
                            <Textarea
                                rows={2}
                                value={templateForm.memo}
                                onChange={(e) => setTemplateForm({ ...templateForm, memo: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTemplateDialog(false)} disabled={templateSubmitting}>
                            Batal
                        </Button>
                        <Button
                            disabled={!templateForm.title || !templateForm.amount || !templateForm.invoice_category_id || templateSubmitting}
                            onClick={createTemplate}
                        >
                            {templateSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Buat Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete template confirmation */}
            <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Template</DialogTitle>
                        <DialogDescription>
                            Yakin ingin menghapus template{' '}
                            <span className="font-medium text-(--color-ink)">{deletingTemplate?.title}</span>? Tagihan
                            yang sudah dibuat sebelumnya tidak akan terhapus.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingTemplate(null)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmDeleteTemplate}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel invoice confirmation */}
            <Dialog open={!!cancellingInvoice} onOpenChange={(open) => !open && setCancellingInvoice(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Batalkan Tagihan</DialogTitle>
                        <DialogDescription>
                            Yakin ingin membatalkan tagihan {cancellingInvoice && formatCurrency(cancellingInvoice.amount)}{' '}
                            untuk{' '}
                            <span className="font-medium text-(--color-ink)">{cancellingInvoice?.tenant.name}</span>?
                            Tagihan akan dipindah ke tab Riwayat dengan status Dibatalkan — ini bukan hapus permanen,
                            jadi tidak bisa ditagih ulang dari sini. Buat tagihan baru kalau salah input.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancellingInvoice(null)} disabled={cancelling}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={confirmCancelInvoice} disabled={cancelling}>
                            {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                            Batalkan Tagihan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
