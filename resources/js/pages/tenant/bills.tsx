import { Head } from '@inertiajs/react';
import { Receipt, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/shared/page-header';

// Mirrors the invoices table.

type InvoiceStatus = 'unpaid' | 'paid' | 'overdue';

type Invoice = {
    id: number;
    invoiceNumber: string;
    invoiceDate: string; // ISO date
    dueDate: string | null; // ISO date
    amount: number;
    status: InvoiceStatus;
    memo: string | null;
    invoiceCategory: { id: number; name: string };
};

type Props = {
    invoices: Invoice[];
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

export default function TenantBills({ invoices }: Props) {
    const [tab, setTab] = useState<'outstanding' | 'history'>('outstanding');

    const outstanding = useMemo(
        () =>
            invoices.filter(
                (inv) => inv.status === 'unpaid' || inv.status === 'overdue',
            ),
        [invoices],
    );

    const history = useMemo(
        () => invoices.filter((inv) => inv.status === 'paid'),
        [invoices],
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
                        <InvoiceCard key={invoice.id} invoice={invoice} />
                    ))}
                </div>
            </div>
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

function InvoiceCard({ invoice }: { invoice: Invoice }) {
    const status = statusMeta[invoice.status];
    const isPayable =
        invoice.status === 'unpaid' || invoice.status === 'overdue';

    return (
        <div className="rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-ink)/8 text-(--color-ink)/60">
                    <Receipt className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-(--color-ink)">
                                {invoice.invoiceCategory.name}
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
                <p className="mt-3 text-center text-xs text-(--color-ink)/45">
                    Hubungi pengelola untuk info pembayaran
                </p>
            )}
        </div>
    );
}

TenantBills.layout = (page: React.ReactNode) => page;
