import { Head, Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Reason = 'pending' | 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled';

type Props = {
    reason?: Reason;
};

const COPY: Record<Reason, { title: string; body: string }> = {
    pending: {
        title: 'Pembayaran belum diselesaikan',
        body: 'Anda memilih paket berbayar saat mendaftar, tapi pembayarannya belum selesai. Selesaikan pembayaran untuk mulai menggunakan HunianID.',
    },
    trialing: {
        title: 'Masa coba gratis sudah berakhir',
        body: 'Fitur ini tidak tersedia sampai Anda memilih paket. Upgrade sekarang untuk melanjutkan tanpa kehilangan data yang sudah tercatat.',
    },
    expired: {
        title: 'Masa coba gratis sudah berakhir',
        body: 'Fitur ini tidak tersedia sampai Anda memilih paket. Upgrade sekarang untuk melanjutkan tanpa kehilangan data yang sudah tercatat.',
    },
    past_due: {
        title: 'Pembayaran tertunda',
        body: 'Pembayaran terakhir Anda belum berhasil diproses. Selesaikan pembayaran untuk melanjutkan.',
    },
    canceled: {
        title: 'Paket Anda telah dibatalkan',
        body: 'Pilih paket baru untuk melanjutkan menggunakan HunianID.',
    },
    active: {
        title: 'Masa coba gratis sudah berakhir',
        body: 'Fitur ini tidak tersedia sampai Anda memilih paket. Upgrade sekarang untuk melanjutkan tanpa kehilangan data yang sudah tercatat.',
    },
};

export default function BillingExpired({ reason = 'expired' }: Props) {
    const { title, body } = COPY[reason];

    return (
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 rounded-[2rem] bg-(--color-bg) p-8 text-center">
            <Head title={title} />

            <span className="grid h-16 w-16 place-items-center rounded-full bg-(--color-coral)/10">
                <AlertTriangle className="h-8 w-8 text-(--color-coral)" />
            </span>

            <h1 className="font-display text-2xl font-bold text-(--color-ink)">
                {title}
            </h1>
            <p className="max-w-md text-sm text-(--color-ink)/65">{body}</p>

            <Button asChild>
                <Link href="/admin/billing">Lihat Paket</Link>
            </Button>
        </div>
    );
}
