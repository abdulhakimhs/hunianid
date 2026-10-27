import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleCheck,
    CircleDollarSign,
    CreditCard,
    Home,
    Loader2,
    Megaphone,
    MessageCircle,
    ReceiptText,
    Send,
    ShieldCheck,
    Sparkles,
    Ticket as TicketIcon,
    UserCircle,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ImageDropzone } from '@/components/image-dropzone';
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
import { startPlanCheckout, useMidtransSnap } from '@/hooks/use-midtrans-snap';
import { dashboard } from '@/routes';

type Guidance =
    | { type: 'complete_profile' }
    | {
          type:
              | 'pengelola_new'
              | 'penghuni_unclaimed'
              | 'penghuni_unclaimed_and_pending_unit'
              | 'penghuni_pending_unit'
              | 'penghuni_active';
          areaId: number;
          areaName: string;
      }
    | null;

function DashboardGuidance({ guidance }: { guidance: Guidance }) {
    if (!guidance) {
return null;
}

    if (guidance.type === 'complete_profile') {
        return (
            <section className="flex items-start gap-3 rounded-[1.5rem] border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 p-5 shadow-elevated">
                <UserCircle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-sky-deep)]" />
                <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Lengkapi profil Anda</h2>
                    <p className="mt-1 text-sm text-[color:var(--color-ink)]/70">
                        Nama dan email Anda belum diisi. Lengkapi data ini supaya akun Anda mudah dikenali oleh pengurus dan warga lain.
                    </p>
                    <Link
                        href="/settings/profile"
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-sky-deep)] px-4 py-2 text-sm font-semibold text-white"
                    >
                        Lengkapi profil
                    </Link>
                </div>
            </section>
        );
    }

    if (guidance.type === 'pengelola_new') {
        return (
            <section className="rounded-[1.5rem] border border-[color:var(--color-sky,#2FC2E8)]/25 bg-[color:var(--color-sky,#2FC2E8)]/10 p-5 shadow-elevated">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep,#1aa3c9)]">
                    Langkah selanjutnya
                </p>
                <h2 className="mt-2 font-display text-lg font-semibold text-[color:var(--color-ink,#142033)]">
                    Undang warga Anda
                </h2>
                <p className="mt-1 text-sm text-[color:var(--color-ink,#142033)]/70">
                    Buat tautan undangan agar warga {guidance.areaName} bisa mulai bergabung.
                </p>
                <Link
                    href="/admin/invites"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-sky-deep,#1aa3c9)] px-4 py-2 text-sm font-semibold text-white"
                >
                    <Send className="h-4 w-4" /> Buat tautan undangan
                </Link>
            </section>
        );
    }

    const showUnclaimedCards =
        guidance.type === 'penghuni_unclaimed' || guidance.type === 'penghuni_unclaimed_and_pending_unit';
    const showPendingUnit =
        guidance.type === 'penghuni_pending_unit' || guidance.type === 'penghuni_unclaimed_and_pending_unit';

    return (
        <div className="flex flex-col gap-4">
            {showUnclaimedCards && (
                <section className="rounded-[1.5rem] border border-[color:var(--color-ink,#142033)]/8 bg-[color:var(--color-surface,#fff)] p-5 shadow-elevated">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep,#1aa3c9)]">
                        Belum ada pengurus di {guidance.areaName}
                    </p>
                    <h2 className="mt-2 font-display text-lg font-semibold text-[color:var(--color-ink,#142033)]">
                        Ajak orang lain bergabung
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Link
                            href="/admin/invites?frame=pengelola"
                            className="flex flex-col gap-2 rounded-2xl border-2 border-[color:var(--color-mint,#1FCB82)] bg-[color:var(--color-mint,#1FCB82)]/10 p-4 text-left"
                        >
                            <ShieldCheck className="h-5 w-5 text-[color:var(--color-mint-deep,#14a869)]" />
                            <span className="font-semibold text-[color:var(--color-ink,#142033)]">Ajak RT/Pengelola Bergabung</span>
                            <span className="text-sm text-[color:var(--color-ink,#142033)]/70">
                                Setelah mereka bergabung, Anda bisa menyerahkan akses pengelola ke akun mereka.
                            </span>
                        </Link>
                        <Link
                            href="/admin/invites?frame=resident"
                            className="flex flex-col gap-2 rounded-2xl border border-[color:var(--color-ink,#142033)]/8 bg-[color:var(--color-bg,#F3FBF9)]/70 p-4 text-left"
                        >
                            <Users className="h-5 w-5 text-[color:var(--color-sky-deep,#1aa3c9)]" />
                            <span className="font-semibold text-[color:var(--color-ink,#142033)]">Ajak Warga Lain Bergabung</span>
                            <span className="text-sm text-[color:var(--color-ink,#142033)]/70">
                                Undang tetangga Anda untuk ikut terdaftar di sini.
                            </span>
                        </Link>
                    </div>
                    <p className="mt-4 text-sm text-[color:var(--color-ink,#142033)]/60">
                        Anda bisa mengundang siapa saja duluan. Nanti, akses sebagai pengelola bisa dipindahkan ke akun warga
                        manapun kapan saja dari halaman ini.
                    </p>
                </section>
            )}

            {showPendingUnit && (
                <section className="flex items-start gap-3 rounded-[1.5rem] border border-[color:var(--color-ink,#142033)]/8 bg-[color:var(--color-surface,#fff)] p-5 shadow-elevated">
                    <Home className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-sky-deep,#1aa3c9)]" />
                    <p className="text-sm text-[color:var(--color-ink,#142033)]">
                        Menunggu konfirmasi dari penghuni yang sudah terdaftar di rumah ini sebelum akses Anda aktif.
                    </p>
                </section>
            )}

            {guidance.type === 'penghuni_active' && (
                <section className="flex items-start gap-3 rounded-[1.5rem] border border-[color:var(--color-sky,#2FC2E8)]/25 bg-[color:var(--color-sky,#2FC2E8)]/10 p-5 shadow-elevated">
                    <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-sky-deep,#1aa3c9)]" />
                    <div className="flex-1">
                        <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink,#142033)]">
                            Akun Anda sudah aktif
                        </h2>
                        <p className="mt-1 text-sm text-[color:var(--color-ink,#142033)]/70">
                            Anda terdaftar sebagai warga {guidance.areaName}. Selain lewat aplikasi ini, Anda juga bisa
                            mengobrol langsung dengan asisten WhatsApp kami untuk:
                        </p>
                        <ul className="mt-3 space-y-1.5 text-sm text-[color:var(--color-ink,#142033)]/70">
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-sky-deep,#1aa3c9)]" />
                                Membuat izin tamu hanya dengan mengetik nama tamu, kendaraan, dan tujuan kunjungan.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-sky-deep,#1aa3c9)]" />
                                Menambah atau melihat anggota keluarga yang terdaftar di rumah Anda.
                            </li>
                        </ul>
                        <p className="mt-3 text-sm text-[color:var(--color-ink,#142033)]/70">
                            Cukup kirim pesan ke WhatsApp yang terdaftar untuk akun Anda — tidak perlu membuka aplikasi.
                        </p>
                    </div>
                </section>
            )}
        </div>
    );
}

type PlanInfo = {
    id: number;
    key: string;
    name: string;
    max_units: number | null;
    price_monthly: number | null;
    price_yearly: number | null;
    is_self_service: boolean;
};

type PaymentRequired = {
    status: 'pending' | 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled';
    plan: PlanInfo | null;
    plans: PlanInfo[];
    midtransClientKey: string | null;
    midtransMode: 'sandbox' | 'production';
} | null;

const PAYMENT_STATUS_COPY: Record<NonNullable<PaymentRequired>['status'], { title: string; body: string }> = {
    pending: {
        title: 'Selesaikan pembayaran untuk mulai memakai HunianID',
        body: 'Anda memilih paket ini saat mendaftar. Modul lain (tagihan, tiket, tamu, dll) akan terbuka otomatis begitu pembayaran dikonfirmasi.',
    },
    trialing: {
        title: 'Masa coba gratis Anda masih berjalan',
        body: 'Pilih paket berbayar kapan saja agar akses tidak terputus setelah masa coba gratis berakhir.',
    },
    expired: {
        title: 'Masa coba gratis sudah berakhir',
        body: 'Lanjutkan dengan paket berbayar untuk kembali memakai HunianID — data yang sudah tercatat tetap aman.',
    },
    past_due: {
        title: 'Pembayaran terakhir Anda belum berhasil',
        body: 'Selesaikan pembayaran untuk mengaktifkan kembali akses penuh.',
    },
    canceled: {
        title: 'Paket Anda telah dibatalkan',
        body: 'Pilih paket baru untuk melanjutkan memakai HunianID.',
    },
    active: {
        title: 'Selesaikan pembayaran untuk mulai memakai HunianID',
        body: 'Modul lain akan terbuka otomatis begitu pembayaran dikonfirmasi.',
    },
};

const PLAN_FEATURES: Record<string, string[]> = {
    standard: [
        'Tagihan, Tamu, Komplain, Broadcast',
        'Tombol darurat & aplikasi satpam',
        'Sampai 150 unit untuk 1 RT',
        'Riwayat & laporan lengkap',
        'Support prioritas via WhatsApp',
    ],
};

function featuresFor(plan: PlanInfo): string[] {
    return (
        PLAN_FEATURES[plan.key] ?? [
            plan.max_units ? `Sampai ${plan.max_units} unit` : 'Unit tanpa batas',
            'Tagihan, Tamu, Komplain, Broadcast',
            'Tombol darurat & aplikasi satpam',
        ]
    );
}

function formatRupiah(amount: number | null): string {
    return amount === null ? 'Gratis' : `Rp${amount.toLocaleString('id-ID')}`;
}

function PaymentRequiredView({ paymentRequired }: { paymentRequired: NonNullable<PaymentRequired> }) {
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
    const snapReady = useMidtransSnap(paymentRequired.midtransClientKey, paymentRequired.midtransMode);
    const copy = PAYMENT_STATUS_COPY[paymentRequired.status];

    function pay(plan: PlanInfo) {
        setLoadingPlanId(plan.id);

        startPlanCheckout(plan.id, cycle)
            .then((data) => {
                if (data.token && snapReady && window.snap) {
                    window.snap.pay(data.token, {
                        onSuccess: () => router.reload(),
                        onPending: () => router.reload(),
                    });
                } else if (data.token) {
                    toast.error('Pembayaran sedang disiapkan, silakan coba lagi dalam beberapa detik.');
                } else {
                    toast.error(
                        data.errors?.plan_id?.[0] ?? data.message ?? 'Gagal memproses pembayaran. Silakan coba lagi.',
                    );
                }
            })
            .catch(() => toast.error('Gagal memproses pembayaran. Silakan coba lagi.'))
            .finally(() => setLoadingPlanId(null));
    }

    const pinnedPlan = paymentRequired.plan;
    const choices = pinnedPlan ? [pinnedPlan] : paymentRequired.plans;

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-sky)]/15 text-[color:var(--color-sky-deep)]">
                <CreditCard className="h-8 w-8" />
            </div>

            <div>
                <h1 className="font-display text-2xl font-bold text-[color:var(--color-ink)] sm:text-3xl">{copy.title}</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--color-ink)]/65">{copy.body}</p>
            </div>

            {choices.length > 1 && (
                <div className="flex items-center gap-2">
                    <Button variant={cycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setCycle('monthly')}>
                        Bulanan
                    </Button>
                    <Button variant={cycle === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => setCycle('yearly')}>
                        Tahunan (hemat 2 bulan)
                    </Button>
                </div>
            )}

            <div className="grid w-full gap-4 sm:grid-cols-2">
                {choices.map((plan) => {
                    const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

                    return (
                        <div
                            key={plan.id}
                            className="relative flex flex-col overflow-hidden rounded-[1.5rem] border border-[color:var(--color-sky-deep)]/25 bg-gradient-to-br from-[color:var(--color-sky)]/12 to-[color:var(--color-sky-deep)]/5 p-6 text-left shadow-elevated-lg"
                        >
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[color:var(--color-sky-deep)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white uppercase">
                                <Sparkles className="h-3 w-3" />
                                {pinnedPlan ? 'Paket pilihan Anda' : 'Paling populer'}
                            </span>

                            <p className="mt-3 font-display text-xl font-semibold text-[color:var(--color-ink)]">Paket {plan.name}</p>
                            <p className="mt-1 font-display text-3xl font-bold text-[color:var(--color-ink)]">
                                {formatRupiah(price)}
                                <span className="ml-1 text-sm font-normal text-[color:var(--color-ink)]/50">
                                    /{cycle === 'yearly' ? 'tahun' : 'bulan'}
                                </span>
                            </p>

                            <ul className="mt-4 space-y-1.5">
                                {featuresFor(plan).map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-[color:var(--color-ink)]/70">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-sky-deep)]" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className="mt-5 w-full gap-1.5 bg-[color:var(--color-sky-deep)] hover:bg-[color:var(--color-sky-deep)]/90"
                                disabled={loadingPlanId === plan.id}
                                onClick={() => pay(plan)}
                            >
                                {loadingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                Bayar Sekarang
                            </Button>
                        </div>
                    );
                })}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-[color:var(--color-ink)]/45">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pembayaran diproses dengan aman melalui Midtrans.
            </p>
        </div>
    );
}

type OpenInvoice = {
    id: number;
    invoiceNumber: string;
    dueDate: string | null;
    amount: number;
    status: 'unpaid' | 'overdue';
    tenant: { id: number; name: string };
    unit: { id: number; label: string };
};

type OpenTicket = {
    id: number;
    subject: string;
    status: 'open' | 'in_progress';
    createdAt: string;
    reporter: { id: number; name: string };
    unit: { id: number; label: string };
};

type ActiveVisitorPass = {
    id: number;
    guestName: string;
    validUntil: string | null;
    unit: string;
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

// Local calendar date, not toISOString() — that's UTC and gives yesterday before 07:00 WIB.
function todayLocal() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const invoiceStatusMeta: Record<OpenInvoice['status'], { label: string; className: string }> = {
    unpaid: { label: 'Belum Dibayar', className: 'bg-amber-100 text-amber-600' },
    overdue: { label: 'Jatuh Tempo', className: 'bg-red-100 text-red-600' },
};

const ticketStatusMeta: Record<OpenTicket['status'], { label: string; className: string }> = {
    open: { label: 'Baru', className: 'bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]' },
    in_progress: { label: 'Diproses', className: 'bg-amber-100 text-amber-600' },
};

function EmptyRow({ children }: { children: React.ReactNode }) {
    return <p className="px-1 py-6 text-center text-sm text-[color:var(--color-ink)]/45">{children}</p>;
}

function WidgetCard({
    title,
    count,
    viewAllHref,
    children,
}: {
    title: string;
    count: number;
    viewAllHref: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">
                    {title} <span className="text-[color:var(--color-ink)]/40">({count})</span>
                </h2>
                <Link href={viewAllHref} className="text-sm font-semibold text-[color:var(--color-sky-deep)]">
                    Lihat semua
                </Link>
            </div>
            <div className="mt-4 space-y-2">{children}</div>
        </div>
    );
}

export default function Dashboard({
    guidance = null,
    status,
    paymentRequired = null,
    openInvoices = [],
    openInvoicesCount = 0,
    openTickets = [],
    openTicketsCount = 0,
    activeVisitorPasses = [],
    activeVisitorPassesCount = 0,
}: {
    guidance?: Guidance;
    status?: string | null;
    paymentRequired?: PaymentRequired;
    openInvoices?: OpenInvoice[];
    openInvoicesCount?: number;
    openTickets?: OpenTicket[];
    openTicketsCount?: number;
    activeVisitorPasses?: ActiveVisitorPass[];
    activeVisitorPassesCount?: number;
}) {
    const [markPaidTarget, setMarkPaidTarget] = useState<OpenInvoice | null>(null);
    const [paidDate, setPaidDate] = useState(todayLocal());
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [markingPaid, setMarkingPaid] = useState(false);

    function openMarkPaid(invoice: OpenInvoice) {
        setPaidDate(todayLocal());
        setPaymentProof(null);
        setMarkPaidTarget(invoice);
    }

    function confirmMarkPaid() {
        if (!markPaidTarget || !paymentProof) {
            return;
        }

        setMarkingPaid(true);
        router.post(
            `/admin/invoices/${markPaidTarget.id}/mark-paid`,
            { paid_at: paidDate, payment_proof: paymentProof },
            {
                forceFormData: true,
                onSuccess: () => setMarkPaidTarget(null),
                onFinish: () => setMarkingPaid(false),
            },
        );
    }

    if (paymentRequired) {
        return (
            <>
                <Head title="Selesaikan Pembayaran" />
                <div className="flex h-full flex-1 flex-col rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
                    <PaymentRequiredView paymentRequired={paymentRequired} />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-[color:var(--color-bg)] p-4 sm:p-6 lg:p-8">
                {status && (
                    <div className="rounded-xl border border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/10 px-4 py-2.5 text-sm text-[color:var(--color-mint-deep)]">
                        {status}
                    </div>
                )}

                <DashboardGuidance guidance={guidance} />

                <section className="relative overflow-hidden rounded-[2rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-6 shadow-elevated lg:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-sky)_16%,_transparent),_transparent_45%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,_var(--color-mint)_16%,_transparent),_transparent_40%)]" />
                    <div className="relative space-y-2">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                            Dashboard pengelola perumahan
                        </p>
                        <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-4xl">
                            Semua yang penting di satu tempat
                        </h1>
                        <p className="max-w-xl text-base leading-relaxed text-[color:var(--color-ink)]/70">
                            Tagihan, tiket, dan tamu aktif tampil langsung di sini — tidak perlu bolak-balik ke halaman lain untuk memantau kondisi hari ini.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                        <div className="inline-flex rounded-2xl bg-[color:var(--color-mint)]/10 p-2.5 text-[color:var(--color-mint-deep)]">
                            <CircleDollarSign className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm text-[color:var(--color-ink)]/60">Tagihan belum lunas</p>
                        <p className="mt-1 font-display text-3xl font-semibold text-[color:var(--color-ink)]">{openInvoicesCount}</p>
                    </div>

                    <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                        <div className="inline-flex rounded-2xl bg-[color:var(--color-coral)]/10 p-2.5 text-[color:var(--color-coral)]">
                            <TicketIcon className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm text-[color:var(--color-ink)]/60">Tiket terbuka</p>
                        <p className="mt-1 font-display text-3xl font-semibold text-[color:var(--color-ink)]">{openTicketsCount}</p>
                    </div>

                    <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                        <div className="inline-flex rounded-2xl bg-[color:var(--color-sky)]/10 p-2.5 text-[color:var(--color-sky-deep)]">
                            <Users className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm text-[color:var(--color-ink)]/60">Tamu aktif</p>
                        <p className="mt-1 font-display text-3xl font-semibold text-[color:var(--color-ink)]">{activeVisitorPassesCount}</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <WidgetCard title="Tagihan Belum Lunas" count={openInvoicesCount} viewAllHref="/admin/invoices">
                        {openInvoices.length === 0 && <EmptyRow>Semua tagihan sudah lunas.</EmptyRow>}
                        {openInvoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="flex flex-col gap-2 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 truncate text-sm font-medium text-[color:var(--color-ink)]">{invoice.tenant.name}</p>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${invoiceStatusMeta[invoice.status].className}`}>
                                        {invoiceStatusMeta[invoice.status].label}
                                    </span>
                                </div>
                                <p className="text-xs text-[color:var(--color-ink)]/50">
                                    {invoice.unit.label} · {formatCurrency(invoice.amount)}
                                </p>
                                <p className="text-xs text-[color:var(--color-ink)]/50">Jatuh tempo {formatDate(invoice.dueDate)}</p>
                                <Button
                                    size="sm"
                                    className="h-8 w-full gap-1.5 rounded-full bg-[color:var(--color-mint)] text-white hover:bg-[color:var(--color-mint-deep)]"
                                    onClick={() => openMarkPaid(invoice)}
                                >
                                    <CircleCheck className="h-3.5 w-3.5" />
                                    Lunas
                                </Button>
                            </div>
                        ))}
                    </WidgetCard>

                    <WidgetCard title="Tiket Terbuka" count={openTicketsCount} viewAllHref="/admin/tickets">
                        {openTickets.length === 0 && <EmptyRow>Tidak ada tiket yang perlu ditindaklanjuti.</EmptyRow>}
                        {openTickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                href={`/admin/tickets/${ticket.id}`}
                                className="flex flex-col gap-2 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 truncate text-sm font-medium text-[color:var(--color-ink)]">{ticket.subject}</p>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${ticketStatusMeta[ticket.status].className}`}>
                                        {ticketStatusMeta[ticket.status].label}
                                    </span>
                                </div>
                                <p className="text-xs text-[color:var(--color-ink)]/50">
                                    {ticket.reporter.name} · {ticket.unit.label}
                                </p>
                            </Link>
                        ))}
                    </WidgetCard>

                    <WidgetCard title="Tamu Aktif" count={activeVisitorPassesCount} viewAllHref="/admin/visitor-passes">
                        {activeVisitorPasses.length === 0 && <EmptyRow>Tidak ada izin tamu yang masih berlaku.</EmptyRow>}
                        {activeVisitorPasses.map((pass) => (
                            <div
                                key={pass.id}
                                className="flex flex-col gap-2 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-2.5"
                            >
                                <p className="min-w-0 truncate text-sm font-medium text-[color:var(--color-ink)]">{pass.guestName}</p>
                                <p className="text-xs text-[color:var(--color-ink)]/50">{pass.unit}</p>
                                <p className="text-xs text-[color:var(--color-ink)]/50">Berlaku s.d. {formatDate(pass.validUntil)}</p>
                            </div>
                        ))}
                    </WidgetCard>
                </div>

                <div className="rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-5 shadow-elevated">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-mint-deep)]">
                        Aksi cepat
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href="/admin/invoices"
                            className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3 text-sm font-medium text-[color:var(--color-ink)]/75"
                        >
                            <ReceiptText className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                            Tagihan
                        </Link>
                        <Link
                            href="/admin/tickets"
                            className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3 text-sm font-medium text-[color:var(--color-ink)]/75"
                        >
                            <TicketIcon className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                            Tiket & Komplain
                        </Link>
                        <Link
                            href="/admin/visitor-passes"
                            className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3 text-sm font-medium text-[color:var(--color-ink)]/75"
                        >
                            <Users className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                            Visitor Pass
                        </Link>
                        <Link
                            href="/admin/announcements"
                            className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 px-3 py-3 text-sm font-medium text-[color:var(--color-ink)]/75"
                        >
                            <Megaphone className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                            Kirim Pengumuman
                        </Link>
                    </div>
                </div>
            </div>

            <Dialog open={!!markPaidTarget} onOpenChange={(open) => !open && !markingPaid && setMarkPaidTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tandai Lunas</DialogTitle>
                        <DialogDescription>
                            {markPaidTarget && `${markPaidTarget.invoiceNumber} · ${markPaidTarget.tenant.name} · ${formatCurrency(markPaidTarget.amount)}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-[color:var(--color-ink)]">Tanggal Bayar</label>
                            <Input type="date" value={paidDate} max={todayLocal()} onChange={(e) => setPaidDate(e.target.value)} />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-[color:var(--color-ink)]">Bukti Bayar</label>
                            <ImageDropzone value={paymentProof} onChange={setPaymentProof} disabled={markingPaid} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMarkPaidTarget(null)} disabled={markingPaid}>
                            Batal
                        </Button>
                        <Button
                            className="bg-[color:var(--color-mint)] text-white hover:bg-[color:var(--color-mint-deep)]"
                            onClick={confirmMarkPaid}
                            disabled={!paidDate || !paymentProof || markingPaid}
                        >
                            {markingPaid && <Loader2 className="h-4 w-4 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
