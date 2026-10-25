import { Link, usePage } from '@inertiajs/react';

export default function SubscriptionBanner() {
    const { subscription } = usePage().props;

    if (!subscription) return null;

    if (subscription.status === 'expired' || subscription.status === 'canceled') {
        return (
            <div className="flex items-center justify-between gap-3 bg-(--color-coral) px-4 py-2 text-sm text-white">
                <span>Masa coba gratis sudah berakhir. Upgrade untuk melanjutkan.</span>
                <Link href="/admin/billing" className="font-semibold underline">
                    Lihat Paket
                </Link>
            </div>
        );
    }

    if (
        subscription.status === 'trialing' &&
        subscription.daysLeft !== null &&
        subscription.daysLeft <= 7
    ) {
        return (
            <div className="flex items-center justify-between gap-3 bg-(--color-coral)/15 px-4 py-2 text-sm text-(--color-ink)">
                <span>
                    {subscription.daysLeft} hari tersisa dari masa coba gratis.
                </span>
                <Link href="/admin/billing" className="font-semibold text-(--color-coral)">
                    Upgrade sekarang
                </Link>
            </div>
        );
    }

    return null;
}
