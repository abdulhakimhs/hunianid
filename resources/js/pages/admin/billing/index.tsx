import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    Loader2,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { startPlanCheckout, useMidtransSnap } from '@/hooks/use-midtrans-snap';

type Plan = {
    id: number;
    key: string;
    name: string;
    max_units: number | null;
    price_monthly: number | null;
    price_yearly: number | null;
    is_self_service: boolean;
};

type Subscription = {
    status: 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled';
    billing_cycle: 'monthly' | 'yearly' | 'trial';
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
    plan: Plan;
};

type Props = {
    subscription: Subscription | null;
    isActive: boolean;
    plans: Plan[];
    midtransClientKey: string | null;
    midtransMode: 'sandbox' | 'production';
};

type Tone = 'mint' | 'sky' | 'coral';

const STATUS_META: Record<Subscription['status'], { label: string; tone: Tone }> = {
    trialing: { label: 'Masa coba gratis', tone: 'sky' },
    active: { label: 'Aktif', tone: 'mint' },
    past_due: { label: 'Pembayaran tertunda', tone: 'coral' },
    expired: { label: 'Berakhir', tone: 'coral' },
    canceled: { label: 'Dibatalkan', tone: 'coral' },
};

const TONE_CLASSNAMES: Record<Tone, string> = {
    mint: 'bg-(--color-mint)/12 text-(--color-mint-deep)',
    sky: 'bg-(--color-sky)/12 text-(--color-sky-deep)',
    coral: 'bg-(--color-coral)/12 text-(--color-coral)',
};

function StatusPill({ status }: { status: Subscription['status'] }) {
    const meta = STATUS_META[status];

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSNAMES[meta.tone]}`}>
            {meta.label}
        </span>
    );
}

// Plan features aren't modeled in the `plans` table (just limits/pricing), so
// this mirrors the same curated copy used on the landing page and dashboard's
// upsell screen — keep in sync with those if plan benefits change.
const PLAN_FEATURES: Record<string, string[]> = {
    standard: [
        'Tagihan, Tamu, Komplain, Broadcast',
        'Tombol darurat & aplikasi satpam',
        'Riwayat & laporan lengkap',
        'Support prioritas via WhatsApp',
    ],
};

function featuresFor(plan: Plan): string[] {
    return (
        PLAN_FEATURES[plan.key] ?? [
            plan.max_units ? `Sampai ${plan.max_units} unit` : 'Unit tanpa batas',
            'Tagihan, Tamu, Komplain, Broadcast',
            'Tombol darurat & aplikasi satpam',
        ]
    );
}

function formatRupiah(amount: number | null): string {
    // This page only ever lists self-service plans (is_self_service=true),
    // so a null price here always means the free trial plan, never Custom
    // (which is filtered out before reaching this page).
    if (amount === null) {
        return 'Gratis';
    }

    return `Rp${amount.toLocaleString('id-ID')}`;
}

function daysLeft(dateStr: string | null): number | null {
    if (!dateStr) {
        return null;
    }

    const diff = new Date(dateStr).getTime() - Date.now();

    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BillingIndex({
    subscription,
    isActive,
    plans,
    midtransClientKey,
    midtransMode,
}: Props) {
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
    const snapReady = useMidtransSnap(midtransClientKey, midtransMode);

    function choosePlan(plan: Plan) {
        setLoadingPlanId(plan.id);

        startPlanCheckout(plan.id, cycle)
            .then((data) => {
                if (data.token && snapReady && window.snap) {
                    window.snap.pay(data.token, {
                        onSuccess: () => router.reload(),
                        onPending: () => router.reload(),
                    });
                } else if (data.token) {
                    // Checkout succeeded but the Snap.js script hasn't finished loading yet.
                    toast.error(
                        'Pembayaran sedang disiapkan, silakan coba lagi dalam beberapa detik.',
                    );
                } else {
                    // Validation failures (e.g. gateway not configured) come back as
                    // Laravel's standard {message, errors} shape, not a top-level `error`.
                    toast.error(
                        data.errors?.plan_id?.[0] ??
                            data.message ??
                            'Gagal memproses pembayaran. Silakan coba lagi.',
                    );
                }
            })
            .catch(() => toast.error('Gagal memproses pembayaran. Silakan coba lagi.'))
            .finally(() => setLoadingPlanId(null));
    }

    const trialDaysLeft = subscription?.status === 'trialing'
        ? daysLeft(subscription.trial_ends_at)
        : null;

    // Trial length is always 30 days (SubscriptionService::startTrial()) — used
    // only to size the progress bar below, not for any access-control logic.
    const trialProgressPct = trialDaysLeft !== null
        ? Math.min(100, Math.max(4, Math.round((trialDaysLeft / 30) * 100)))
        : null;

    const purchasablePlans = plans.filter(
        // The trial plan is auto-granted at registration, not something to
        // buy here — only list plans that actually have a price to check out with.
        (plan) => plan.is_self_service && plan.price_monthly !== null,
    );

    return (
        <div className="flex h-full flex-1 flex-col gap-6 rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Paket & Pembayaran" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold tracking-[0.1em] text-(--color-sky-deep) uppercase">
                        Langganan
                    </p>
                    <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                        Paket & Pembayaran
                    </h1>
                </div>
                {subscription && <StatusPill status={subscription.status} />}
            </div>

            {subscription && (
                <section className="relative overflow-hidden rounded-[2rem] border border-(--color-ink)/8 bg-(--color-surface) p-6 shadow-elevated lg:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,_var(--color-sky)_14%,_transparent),_transparent_45%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,_var(--color-mint)_14%,_transparent),_transparent_40%)]" />

                    <div className="relative flex items-start gap-4">
                        <span className="icon-chip-ai grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white">
                            <CreditCard className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold text-(--color-ink)/50">Paket saat ini</p>
                            <h2 className="mt-0.5 font-display text-xl font-bold text-(--color-ink)">
                                {subscription.plan.name}
                            </h2>

                            {trialDaysLeft !== null ? (
                                <p className="mt-1 text-sm text-(--color-ink)/65">
                                    <span className="font-semibold text-(--color-sky-deep)">{trialDaysLeft} hari</span>{' '}
                                    tersisa dari masa coba gratis
                                </p>
                            ) : subscription.current_period_ends_at ? (
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-(--color-ink)/65">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Berlaku sampai{' '}
                                    {new Date(subscription.current_period_ends_at).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {trialDaysLeft !== null && trialProgressPct !== null && (
                        <div className="relative mt-5">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-ink)/8">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-(--color-sky-deep) to-(--color-sky) transition-[width] duration-500"
                                    style={{ width: `${trialProgressPct}%` }}
                                />
                            </div>
                            <p className="mt-3 flex items-start gap-1.5 text-xs text-(--color-mint-deep)">
                                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                Sisa {trialDaysLeft} hari masa coba akan otomatis ditambahkan ke akhir periode berbayar
                                begitu Anda membayar — tidak ada yang hilang.
                            </p>
                        </div>
                    )}

                    {!isActive && (
                        <div className="relative mt-5 flex items-start gap-2 rounded-2xl border border-(--color-coral)/25 bg-(--color-coral)/8 px-4 py-3 text-sm text-(--color-coral)">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Akses Anda sedang terkunci. Pilih paket di bawah untuk mengaktifkan kembali.
                        </div>
                    )}
                </section>
            )}

            <div className="inline-flex w-fit items-center gap-1 rounded-full border border-(--color-ink)/10 bg-(--color-surface) p-1 shadow-elevated">
                <button
                    type="button"
                    onClick={() => setCycle('monthly')}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        cycle === 'monthly'
                            ? 'bg-(--color-ink) text-white'
                            : 'text-(--color-ink)/60 hover:text-(--color-ink)'
                    }`}
                >
                    Bulanan
                </button>
                <button
                    type="button"
                    onClick={() => setCycle('yearly')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        cycle === 'yearly'
                            ? 'bg-(--color-ink) text-white'
                            : 'text-(--color-ink)/60 hover:text-(--color-ink)'
                    }`}
                >
                    Tahunan
                    <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            cycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-(--color-mint)/15 text-(--color-mint-deep)'
                        }`}
                    >
                        Hemat 2 bulan
                    </span>
                </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {purchasablePlans.map((plan) => {
                    const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                    const isCurrentActivePlan = subscription?.status === 'active' && subscription.plan.id === plan.id;
                    const highlight = !isCurrentActivePlan && plan.key === 'standard';

                    return (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col overflow-hidden rounded-[1.75rem] border p-6 transition hover:-translate-y-0.5 ${
                                isCurrentActivePlan
                                    ? 'border-(--color-mint)/35 bg-(--color-mint)/5 shadow-elevated'
                                    : highlight
                                      ? 'border-(--color-sky-deep)/30 bg-gradient-to-br from-(--color-sky)/10 to-(--color-sky-deep)/5 shadow-elevated-lg'
                                      : 'border-(--color-ink)/8 bg-(--color-surface) shadow-elevated'
                            }`}
                        >
                            {isCurrentActivePlan ? (
                                <span className="absolute top-5 right-5 inline-flex items-center gap-1 rounded-full bg-(--color-mint)/15 px-2.5 py-1 text-[11px] font-semibold text-(--color-mint-deep)">
                                    <CheckCircle2 className="h-3 w-3" /> Paket Anda
                                </span>
                            ) : highlight ? (
                                <span
                                    className="absolute top-5 right-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))' }}
                                >
                                    <Sparkles className="h-3 w-3" /> Populer
                                </span>
                            ) : null}

                            <h3 className="font-display text-lg font-bold text-(--color-ink)">{plan.name}</h3>
                            <p className="mt-1 text-sm text-(--color-ink)/60">
                                {plan.max_units ? `Sampai ${plan.max_units} unit` : 'Unit tanpa batas'}
                            </p>

                            <div className="mt-5 flex items-baseline gap-1.5">
                                <span className="font-display text-3xl font-extrabold tabular-nums text-(--color-ink)">
                                    {formatRupiah(price)}
                                </span>
                                <span className="text-sm text-(--color-ink)/50">
                                    /{cycle === 'yearly' ? 'tahun' : 'bulan'}
                                </span>
                            </div>

                            <ul className="mt-5 flex-1 space-y-2.5">
                                {featuresFor(plan).map((feature) => (
                                    <li key={feature} className="flex items-start gap-2.5 text-sm text-(--color-ink)/75">
                                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-(--color-mint)/15">
                                            <CheckCircle2 className="h-3 w-3 text-(--color-mint-deep)" />
                                        </span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                className={highlight && !isCurrentActivePlan ? 'mt-6 w-full gap-2 shadow-elevated text-white hover:opacity-90' : 'mt-6 w-full gap-2'}
                                style={
                                    highlight && !isCurrentActivePlan
                                        ? { background: 'linear-gradient(135deg, var(--color-sky-deep), var(--color-sky))' }
                                        : undefined
                                }
                                variant={isCurrentActivePlan ? 'outline' : 'default'}
                                disabled={loadingPlanId === plan.id}
                                onClick={() => choosePlan(plan)}
                            >
                                {loadingPlanId === plan.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isCurrentActivePlan ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <CreditCard className="h-4 w-4" />
                                )}
                                {isCurrentActivePlan ? 'Perpanjang Sekarang' : `Pilih ${plan.name}`}
                            </Button>
                        </div>
                    );
                })}
            </div>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-(--color-ink)/45">
                <ShieldCheck className="h-3.5 w-3.5" />
                Pembayaran diproses dengan aman melalui Midtrans.
            </p>
        </div>
    );
}
