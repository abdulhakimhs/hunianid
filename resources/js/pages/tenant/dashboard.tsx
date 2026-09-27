import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    Building2,
    ChevronRight,
    CreditCard,
    LifeBuoy,
    QrCode,
    Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import TenantBottomNav from '@/components/tenant/bottom-nav';

// Dummy data — swap for real props from GET /tenant once the backend
// endpoint exists.

const dummyResident = {
    name: 'Dewi Lestari',
    unit: 'Blok B-08',
};

const dummyBill = {
    amount: 'Rp 850.000',
    dueDate: '20 Sep 2026',
};

// Dummy — swap for a real check like "user has zero bills, zero tickets,
// and zero visitor passes ever created" once the backend exists. Toggle
// this to false locally to preview the returning-tenant view.
const isFirstTimeTenant = true;

type Tile = {
    key: string;
    href: string;
    icon: typeof CreditCard;
    label: string;
    className: string;
};

const tiles: Tile[] = [
    {
        key: 'bills',
        href: '/tenant/bills',
        icon: CreditCard,
        label: 'Tagihan',
        className: 'bg-(--color-sky)/15 text-(--color-sky-deep)',
    },
    {
        key: 'visitor-pass',
        href: '/tenant/visitor-pass',
        icon: QrCode,
        label: 'Tamu',
        className: 'bg-violet-100 text-violet-600',
    },
    {
        key: 'tickets',
        href: '/tenant/tickets',
        icon: LifeBuoy,
        label: 'Tiket',
        className: 'bg-amber-100 text-amber-600',
    },
    // Fasilitas (facility booking) deferred post-MVP — add back here
    // as a fourth tile once that feature is ready.
];

export default function TenantDashboard() {
    return (
        <>
            <Head title="Beranda" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader
                    title="Beranda"
                    tone="tenant"
                    rightSlot={
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
                            <Building2 className="h-4 w-4" />
                        </div>
                    }
                />

                <div className="px-5 pt-4 pb-1">
                    <p className="text-xs text-(--color-ink)/50">
                        Selamat datang,
                    </p>
                    <p className="text-sm font-semibold text-(--color-ink)">
                        {dummyResident.name} · {dummyResident.unit}
                    </p>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-3 pb-28">
                    {isFirstTimeTenant ? (
                        <OnboardingCard name={dummyResident.name} />
                    ) : (
                        <Link href="/tenant/bills" className="block">
                            <div className="flex items-center gap-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) px-4 py-3.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-sky)/15 text-(--color-sky-deep)">
                                    <CreditCard className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-(--color-ink)">
                                        Tagihan {dummyBill.amount}
                                    </p>
                                    <p className="text-xs text-(--color-ink)/45">
                                        Jatuh tempo {dummyBill.dueDate}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-(--color-ink)/30" />
                            </div>
                        </Link>
                    )}

                    {/* Main tiles */}
                    <div className="grid grid-cols-3 gap-3">
                        {tiles.map((tile) => {
                            const Icon = tile.icon;

                            return (
                                <Link
                                    key={tile.key}
                                    href={tile.href}
                                    className="block"
                                >
                                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-(--color-ink)/6 bg-(--color-surface) px-2 py-5 text-center shadow-sm transition active:scale-[0.97]">
                                        <div
                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tile.className}`}
                                        >
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-semibold text-(--color-ink)">
                                            {tile.label}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Floating panic button */}
                <Link
                    href="/tenant/panic"
                    className="fixed right-5 bottom-24 z-20 mx-auto flex w-full max-w-sm justify-end"
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 active:scale-95">
                        <AlertOctagon className="h-6 w-6" />
                    </span>
                </Link>

                <TenantBottomNav active="home" unreadCount={2} />
            </div>
        </>
    );
}

TenantDashboard.layout = (page: React.ReactNode) => page;

function OnboardingCard({ name }: { name: string }) {
    return (
        <div className="rounded-2xl border border-(--color-sky)/25 bg-(--color-sky)/8 p-5">
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-(--color-sky-deep)" />
                <p className="text-sm font-semibold text-(--color-ink)">
                    Selamat datang, {name}!
                </p>
            </div>

            <p className="mt-2 text-sm text-(--color-ink)/60">
                Berikut yang bisa Anda lakukan di sini:
            </p>

            <ul className="mt-3 space-y-2 text-sm text-(--color-ink)/70">
                <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-sky-deep)" />
                    Lihat dan bayar tagihan bulanan di{' '}
                    <span className="font-medium">Tagihan</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-sky-deep)" />
                    Buat pass untuk tamu Anda di{' '}
                    <span className="font-medium">Tamu</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-sky-deep)" />
                    Laporkan masalah unit di{' '}
                    <span className="font-medium">Tiket</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
                    Tombol merah di kanan bawah untuk keadaan darurat
                </li>
            </ul>
        </div>
    );
}
