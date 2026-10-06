import { Head, router } from '@inertiajs/react';
import { Loader2, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
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

type InvoiceCategoryOption = {
    id: number;
    name: string;
    defaultAmount: number | null;
};

type UnitOption = {
    unitId: number;
    unitLabel: string;
    tenants: { id: number; name: string; phone: string | null }[];
};

type Props = {
    units: UnitOption[];
    categories: InvoiceCategoryOption[];
};

type TenantRow = {
    id: number;
    name: string;
    phone: string | null;
    unitLabel: string;
};

export default function InvoicesCreate({ units, categories }: Props) {
    const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([]);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<string>(categories[0] ? String(categories[0].id) : '');
    const [memo, setMemo] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [dueInDays, setDueInDays] = useState('14');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const tenantRows = useMemo<TenantRow[]>(
        () =>
            units.flatMap((unit) =>
                unit.tenants.map((tenant) => ({
                    id: tenant.id,
                    name: tenant.name,
                    phone: tenant.phone,
                    unitLabel: unit.unitLabel,
                })),
            ),
        [units],
    );

    const matchesTenant = (t: TenantRow, q: string) =>
        `${t.name} ${t.phone ?? ''} ${t.unitLabel}`.toLowerCase().includes(q);

    const {
        search,
        setSearch,
        page: currentPage,
        setPage,
        pageCount,
        filtered: filteredTenants,
        paginated: paginatedTenants,
    } = useTableSearch(tenantRows, matchesTenant);

    const filteredTenantIds = useMemo(() => filteredTenants.map((t) => t.id), [filteredTenants]);
    const allSelected =
        filteredTenantIds.length > 0 && filteredTenantIds.every((id) => selectedTenantIds.includes(id));

    function toggleTenant(id: number) {
        setSelectedTenantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function toggleAll() {
        if (allSelected) {
            setSelectedTenantIds((prev) => prev.filter((id) => !filteredTenantIds.includes(id)));
        } else {
            setSelectedTenantIds((prev) => Array.from(new Set([...prev, ...filteredTenantIds])));
        }
    }

    function selectCategory(id: string) {
        setCategoryId(id);
        const category = categories.find((c) => String(c.id) === id);

        if (category?.defaultAmount !== null && category?.defaultAmount !== undefined) {
            setAmount(String(category.defaultAmount));
        }
    }

    function submit() {
        setSubmitting(true);

        router.post(
            '/admin/invoices',
            {
                tenant_ids: selectedTenantIds,
                amount,
                invoice_category_id: categoryId,
                memo: memo || null,
                due_date: dueDate || null,
                save_as_template: saveAsTemplate,
                template_title: saveAsTemplate ? templateTitle : undefined,
                day_of_month: saveAsTemplate ? dayOfMonth : undefined,
                due_in_days: saveAsTemplate ? dueInDays : undefined,
            },
            {
                onError: setErrors,
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Buat Tagihan" />

            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Tagihan
                </p>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                Buat Tagihan
            </h1>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <section className="shadow-elevated flex flex-col overflow-hidden rounded-2xl border border-(--color-ink)/8 bg-(--color-surface)">
                    <div className="flex flex-col gap-3 border-b border-(--color-ink)/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-(--color-ink)">Pilih Penghuni</p>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-56">
                                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-(--color-ink)/35" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Cari nama, unit, telepon..."
                                    className="w-full rounded-lg border border-(--color-ink)/10 bg-(--color-bg) py-1.5 pr-3 pl-8 text-sm text-(--color-ink) outline-none placeholder:text-(--color-ink)/40 focus:border-(--color-sky)/50 focus:ring-2 focus:ring-(--color-sky)/15"
                                />
                            </div>
                        </div>
                    </div>

                    {errors.tenant_ids && (
                        <p className="px-4 pt-3 text-sm text-(--color-coral)">{errors.tenant_ids}</p>
                    )}

                    <Table className="w-full table-fixed">
                        <TableHeader>
                            <TableRow className="border-(--color-ink)/8 hover:bg-transparent">
                                <TableHead className="h-8 w-10 pl-4">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={toggleAll}
                                        aria-label={allSelected ? 'Batalkan semua' : 'Pilih semua'}
                                    />
                                </TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Nama</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Unit</TableHead>
                                <TableHead className="h-8 text-[11px] font-medium text-(--color-ink)/40">Telepon</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTenants.map((tenant) => (
                                <TableRow key={tenant.id} className="border-(--color-ink)/6 last:border-0">
                                    <TableCell className="py-2 pl-4">
                                        <Checkbox
                                            checked={selectedTenantIds.includes(tenant.id)}
                                            onCheckedChange={() => toggleTenant(tenant.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm text-(--color-ink)">{tenant.name}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm text-(--color-ink)/60">{tenant.unitLabel}</span>
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <span className="text-sm text-(--color-ink)/60">{tenant.phone ?? '—'}</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredTenants.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-ink)/5 text-(--color-ink)/40">
                                <Users className="h-4.5 w-4.5" />
                            </span>
                            <p className="text-sm text-(--color-ink)/50">
                                {tenantRows.length === 0
                                    ? 'Belum ada penghuni aktif di area ini.'
                                    : 'Tidak ada penghuni yang cocok dengan pencarian.'}
                            </p>
                        </div>
                    )}

                    <DataTablePagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />

                    {selectedTenantIds.length > 0 && (
                        <p className="border-t border-(--color-ink)/8 px-4 py-2 text-xs text-(--color-ink)/50">
                            {selectedTenantIds.length} penghuni dipilih
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-4 rounded-[2rem] border border-(--color-ink)/8 bg-(--color-surface) p-6 shadow-elevated">
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
                            <Select value={categoryId} onValueChange={selectCategory}>
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
                        {errors.invoice_category_id && <p className="text-sm text-(--color-coral)">{errors.invoice_category_id}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-(--color-ink)">Nominal</label>
                        <CurrencyInput value={amount} onValueChange={setAmount} />
                        {errors.amount && <p className="text-sm text-(--color-coral)">{errors.amount}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-(--color-ink)">Jatuh Tempo</label>
                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-(--color-ink)">Catatan (opsional)</label>
                        <Textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={1000} />
                    </div>

                    <div className="rounded-xl border border-(--color-ink)/8 p-4">
                        <label className="flex items-center gap-2.5 text-sm font-medium text-(--color-ink)">
                            <Checkbox checked={saveAsTemplate} onCheckedChange={() => setSaveAsTemplate((v) => !v)} />
                            Simpan sebagai tagihan berulang (bulanan)
                        </label>

                        {saveAsTemplate && (
                            <div className="mt-3 flex flex-col gap-3">
                                <p className="text-xs text-(--color-ink)/50">
                                    Tagihan berulang akan otomatis dibuat untuk semua penghuni aktif di area ini setiap
                                    bulan — bukan hanya penghuni yang dipilih di atas untuk tagihan ini.
                                </p>

                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-(--color-ink)">Judul Template</label>
                                    <Input
                                        value={templateTitle}
                                        placeholder="Contoh: IPL Perumahan"
                                        onChange={(e) => setTemplateTitle(e.target.value)}
                                    />
                                    {errors.template_title && <p className="text-sm text-(--color-coral)">{errors.template_title}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium text-(--color-ink)">Tanggal dibuat</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={28}
                                            value={dayOfMonth}
                                            onChange={(e) => setDayOfMonth(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium text-(--color-ink)">Jatuh tempo (hari)</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={dueInDays}
                                            onChange={(e) => setDueInDays(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        disabled={selectedTenantIds.length === 0 || !amount || !categoryId || submitting}
                        onClick={submit}
                        className="h-11"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Buat Tagihan
                    </Button>
                </section>
            </div>
        </div>
    );
}
