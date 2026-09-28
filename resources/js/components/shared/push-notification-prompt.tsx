import { Bell, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export default function PushNotificationPrompt() {
    const { status, loading, subscribe } = usePushNotifications();

    if (
        status === 'unsupported' ||
        status === 'subscribed' ||
        status === 'checking'
    ) {
        return null;
    }

    if (status === 'denied') {
        return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-700">
                    Notifikasi diblokir
                </p>
                <p className="mt-1 text-xs text-amber-600">
                    Aktifkan izin notifikasi di pengaturan browser Anda agar
                    tidak ketinggalan info penting.
                </p>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-2xl border border-(--color-sky)/25 bg-(--color-sky)/10 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-sky)/20 text-(--color-sky-deep)">
                <Bell className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--color-ink)">
                    Aktifkan notifikasi
                </p>
                <p className="text-xs text-(--color-ink)/50">
                    Dapatkan info tagihan, balasan tiket, dan lainnya secara
                    langsung.
                </p>
            </div>

            <button
                type="button"
                onClick={subscribe}
                disabled={loading}
                className="shrink-0 rounded-full bg-(--color-sky-deep) px-3.5 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    'Aktifkan'
                )}
            </button>
        </div>
    );
}
