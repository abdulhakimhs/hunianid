import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

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

const STATUS_LABEL: Record<Subscription['status'], string> = {
    trialing: 'Masa coba gratis',
    active: 'Aktif',
    past_due: 'Pembayaran tertunda',
    expired: 'Berakhir',
    canceled: 'Dibatalkan',
};

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
    const [snapReady, setSnapReady] = useState(false);

    useEffect(() => {
        if (!midtransClientKey) {
return;
}

        const script = document.createElement('script');
        script.src =
            midtransMode === 'production'
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', midtransClientKey);
        script.onload = () => setSnapReady(true);
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, [midtransClientKey, midtransMode]);

    function choosePlan(plan: Plan) {
        setLoadingPlanId(plan.id);

        // Laravel's VerifyCsrfToken reads this cookie (set on every response)
        // against the X-XSRF-TOKEN header — the same mechanism axios/Inertia use
        // automatically; this page uses a plain fetch so it's done by hand here.
        const xsrfToken = decodeURIComponent(
            document.cookie
                .split('; ')
                .find((row) => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1] ?? '',
        );

        fetch('/admin/billing/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': xsrfToken,
            },
            body: JSON.stringify({ plan_id: plan.id, billing_cycle: cycle }),
        })
            .then((res) => res.json())
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

    return (
        <div className="flex h-full flex-1 flex-col gap-6 rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Paket & Pembayaran" />

            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Paket & Pembayaran
                </h1>
                {subscription && (
                    <Badge variant={isActive ? 'default' : 'destructive'}>
                        {STATUS_LABEL[subscription.status]}
                    </Badge>
                )}
            </div>

            {subscription && (
                <Card>
                    <CardHeader>
                        <CardTitle>Paket saat ini: {subscription.plan.name}</CardTitle>
                        <CardDescription>
                            {trialDaysLeft !== null
                                ? `${trialDaysLeft} hari tersisa dari masa coba gratis.`
                                : subscription.current_period_ends_at
                                  ? `Berlaku sampai ${new Date(subscription.current_period_ends_at).toLocaleDateString('id-ID')}.`
                                  : null}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            <div className="flex items-center gap-2">
                <Button
                    variant={cycle === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCycle('monthly')}
                >
                    Bulanan
                </Button>
                <Button
                    variant={cycle === 'yearly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCycle('yearly')}
                >
                    Tahunan (hemat 2 bulan)
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {plans
                    // The trial plan is auto-granted at registration, not something to
                    // buy here — only list plans that actually have a price to check out with.
                    .filter((plan) => plan.is_self_service && plan.price_monthly !== null)
                    .map((plan) => (
                        <Card key={plan.id}>
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>
                                    {plan.max_units
                                        ? `Sampai ${plan.max_units} unit`
                                        : 'Unit tanpa batas'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4">
                                <p className="font-mono text-2xl font-semibold text-(--color-ink)">
                                    {cycle === 'yearly'
                                        ? formatRupiah(plan.price_yearly)
                                        : formatRupiah(plan.price_monthly)}
                                </p>
                                <Button
                                    disabled={loadingPlanId === plan.id}
                                    onClick={() => choosePlan(plan)}
                                >
                                    {loadingPlanId === plan.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Pilih {plan.name}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
            </div>
        </div>
    );
}

declare global {
    interface Window {
        snap?: {
            pay: (
                token: string,
                options?: { onSuccess?: () => void; onPending?: () => void },
            ) => void;
        };
    }
}
