import { Head, Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingExpired() {
    return (
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 rounded-[2rem] bg-(--color-bg) p-8 text-center">
            <Head title="Masa Coba Gratis Berakhir" />

            <span className="grid h-16 w-16 place-items-center rounded-full bg-(--color-coral)/10">
                <AlertTriangle className="h-8 w-8 text-(--color-coral)" />
            </span>

            <h1 className="font-display text-2xl font-bold text-(--color-ink)">
                Masa coba gratis sudah berakhir
            </h1>
            <p className="max-w-md text-sm text-(--color-ink)/65">
                Fitur ini tidak tersedia sampai Anda memilih paket. Upgrade
                sekarang untuk melanjutkan tanpa kehilangan data yang sudah
                tercatat.
            </p>

            <Button asChild>
                <Link href="/admin/billing">Lihat Paket</Link>
            </Button>
        </div>
    );
}
