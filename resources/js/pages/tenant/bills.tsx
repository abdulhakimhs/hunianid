import { Head } from '@inertiajs/react';
import { Car, Home, Receipt, Wallet, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

// Mirrors the invoices table.

type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';
type InvoiceCategory =
    'maintenance_fee' | 'utility_bill' | 'parking_fee' | 'other';

type Invoice = {
    id: number;
    invoiceNumber: string;
    invoiceDate: string; // ISO date
    dueDate: string | null; // ISO date
    amount: number;
    status: InvoiceStatus;
    memo: string | null;
    invoiceCategory: InvoiceCategory;
};

const dummyInvoices: Invoice[] = [
    {
        id: 1,
        invoiceNumber: 'INV/2026/09/0142',
        invoiceDate: '2026-09-01',
        dueDate: '2026-09-20',
        amount: 750000,
        status: 'unpaid',
        memo: null,
        invoiceCategory: 'maintenance_fee',
    },
    {
        id: 2,
        invoiceNumber: 'INV/2026/09/0143',
        invoiceDate: '2026-09-01',
        dueDate: '2026-09-10',
        amount: 185000,
        status: 'overdue',
        memo: 'Air & kebersihan',
        invoiceCategory: 'utility_bill',
    },
    {
        id: 3,
        invoiceNumber: 'INV/2026/08/0098',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-20',
        amount: 100000,
        status: 'paid',
        memo: null,
        invoiceCategory: 'parking_fee',
    },
    {
        id: 4,
        invoiceNumber: 'INV/2026/08/0067',
        invoiceDate: '2026-08-01',
        dueDate: '2026-08-20',
        amount: 750000,
        status: 'paid',
        memo: null,
        invoiceCategory: 'maintenance_fee',
    },
    {
        id: 5,
        invoiceNumber: 'INV/2026/07/0051',
        invoiceDate: '2026-07-05',
        dueDate: '2026-07-25',
        amount: 250000,
        status: 'paid',
        memo: 'Perbaikan pagar unit',
        invoiceCategory: 'other',
    },
];

const categoryMeta: Record<
    InvoiceCategory,
    { label: string; icon: typeof Home; className: string }
> = {
    maintenance_fee: {
        label: 'Iuran Bulanan',
        icon: Home,
        className: 'bg-(--color-mint)/15 text-(--color-mint-deep)',
    },
    utility_bill: {
        label: 'Tagihan Utilitas',
        icon: Zap,
        className: 'bg-(--color-sky)/15 text-(--color-sky-deep)',
    },
    parking_fee: {
        label: 'Biaya Parkir',
        icon: Car,
        className: 'bg-violet-100 text-violet-600',
    },
    other: {
        label: 'Lainnya',
        icon: Receipt,
        className: 'bg-(--color-ink)/8 text-(--color-ink)/60',
    },
};

const statusMeta: Record<InvoiceStatus, { label: string; className: string }> =
    {
        unpaid: {
            label: 'Belum Dibayar',
            className: 'bg-amber-100 text-amber-600',
        },
        overdue: { label: 'Jatuh Tempo', className: 'bg-red-100 text-red-600' },
        paid: {
            label: 'Lunas',
            className: 'bg-(--color-mint)/12 text-(--color-mint-deep)',
        },
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

    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function TenantBills() {
    const [tab, setTab] = useState<'outstanding' | 'history'>('outstanding');
    const [payTarget, setPayTarget] = useState<Invoice | null>(null);

    const outstanding = useMemo(
        () =>
            dummyInvoices.filter(
                (inv) => inv.status === 'unpaid' || inv.status === 'overdue',
            ),
        [],
    );

    const history = useMemo(
        () => dummyInvoices.filter((inv) => inv.status === 'paid'),
        [],
    );

    const totalOutstanding = useMemo(
        () => outstanding.reduce((sum, inv) => sum + inv.amount, 0),
        [outstanding],
    );

    const overdueCount = useMemo(
        () => outstanding.filter((inv) => inv.status === 'overdue').length,
        [outstanding],
    );

    const list = tab === 'outstanding' ? outstanding : history;

    return (
        <>
            <Head title="Tagihan" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader title="Tagihan" backHref="/tenant/" tone="tenant" />

                {/* Summary */}
                <div className="mx-5 mt-4 rounded-2xl bg-(--color-ink) p-5 text-white">
                    <p className="text-xs text-white/60">Total tagihan aktif</p>
                    <p className="mt-1 text-2xl font-bold">
                        {formatCurrency(totalOutstanding)}
                    </p>

                    {overdueCount > 0 && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            {overdueCount} tagihan sudah jatuh tempo
                        </p>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-4">
                    <TabButton
                        active={tab === 'outstanding'}
                        onClick={() => setTab('outstanding')}
                        label={`Belum Dibayar (${outstanding.length})`}
                    />
                    <TabButton
                        active={tab === 'history'}
                        onClick={() => setTab('history')}
                        label="Riwayat"
                    />
                </div>

                {/* List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-4 pb-10">
                    {list.length === 0 && <EmptyState tab={tab} />}

                    {list.map((invoice) => (
                        <InvoiceCard
                            key={invoice.id}
                            invoice={invoice}
                            onPay={() => setPayTarget(invoice)}
                        />
                    ))}
                </div>
            </div>

            {payTarget && (
                <PaymentPlaceholderSheet
                    invoice={payTarget}
                    onClose={() => setPayTarget(null)}
                />
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

function EmptyState({ tab }: { tab: 'outstanding' | 'history' }) {
    const message =
        tab === 'outstanding'
            ? 'Semua tagihan sudah lunas. Tidak ada yang perlu dibayar.'
            : 'Belum ada riwayat pembayaran.';

    return (
        <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <Wallet className="h-8 w-8 text-(--color-ink)/25" />
            <p className="text-sm text-(--color-ink)/45">{message}</p>
        </div>
    );
}

function InvoiceCard({
    invoice,
    onPay,
}: {
    invoice: Invoice;
    onPay: () => void;
}) {
    const category = categoryMeta[invoice.invoiceCategory];
    const status = statusMeta[invoice.status];
    const CategoryIcon = category.icon;
    const isPayable =
        invoice.status === 'unpaid' || invoice.status === 'overdue';

    return (
        <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
            <div className="flex items-start gap-3">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.className}`}
                >
                    <CategoryIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-(--color-ink)">
                                {category.label}
                            </p>
                            <p className="truncate text-xs text-(--color-ink)/40">
                                {invoice.invoiceNumber}
                            </p>
                        </div>
                        <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}
                        >
                            {status.label}
                        </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <p className="text-base font-bold text-(--color-ink)">
                            {formatCurrency(invoice.amount)}
                        </p>
                        <p className="text-xs text-(--color-ink)/45">
                            Jatuh tempo {formatDate(invoice.dueDate)}
                        </p>
                    </div>

                    {invoice.memo && (
                        <p className="mt-1 text-xs text-(--color-ink)/40">
                            {invoice.memo}
                        </p>
                    )}
                </div>
            </div>

            {isPayable && (
                <Button
                    onClick={onPay}
                    className="mt-3 h-10 w-full bg-(--color-sky-deep) text-sm hover:bg-(--color-sky-deep)/90"
                >
                    Bayar Sekarang
                </Button>
            )}
        </div>
    );
}

function PaymentPlaceholderSheet({
    invoice,
    onClose,
}: {
    invoice: Invoice;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-t-3xl bg-(--color-surface) p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-(--color-ink)/15" />

                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-base font-semibold text-(--color-ink)">
                            Bayar Tagihan
                        </p>
                        <p className="text-sm text-(--color-ink)/50">
                            {invoice.invoiceNumber}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-(--color-ink)/40"
                        aria-label="Tutup"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4 rounded-xl bg-(--color-ink)/[0.03] p-4 text-center">
                    <p className="text-2xl font-bold text-(--color-ink)">
                        {formatCurrency(invoice.amount)}
                    </p>
                </div>

                <p className="mt-4 text-center text-sm text-(--color-ink)/50">
                    Metode pembayaran online segera hadir. Untuk saat ini,
                    silakan hubungi pengelola untuk instruksi pembayaran.
                </p>

                <Button
                    variant="outline"
                    className="mt-5 h-12 w-full"
                    onClick={onClose}
                >
                    Tutup
                </Button>
            </div>
        </div>
    );
}

TenantBills.layout = (page: React.ReactNode) => page;
