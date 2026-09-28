import { Head, Link } from '@inertiajs/react';
import {
    AlertOctagon,
    Bell,
    CreditCard,
    MessageSquare,
    QrCode,
} from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import PushNotificationPrompt from '@/components/shared/push-notification-prompt';
import TenantBottomNav from '@/components/tenant/bottom-nav';

type NotificationType =
    'ticket_reply' | 'bill_due' | 'visitor_used' | 'panic_ack';

type AppNotification = {
    id: number;
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    createdAt: string;
    read: boolean;
};

const dummyNotifications: AppNotification[] = [
    {
        id: 1,
        type: 'ticket_reply',
        title: 'Balasan Tiket',
        body: 'Pak Joko membalas tiket "AC unit tidak dingin"',
        href: '/tenant/tickets/1',
        createdAt: '2026-09-16T14:20:00',
        read: false,
    },
    {
        id: 2,
        type: 'bill_due',
        title: 'Tagihan Jatuh Tempo',
        body: 'Tagihan utilitas Rp 185.000 jatuh tempo 10 Sep',
        href: '/tenant/bills',
        createdAt: '2026-09-15T08:00:00',
        read: false,
    },
    {
        id: 3,
        type: 'visitor_used',
        title: 'Pass Tamu Digunakan',
        body: 'Andi Wijaya telah masuk melalui gerbang utama',
        href: '/tenant/visitor-pass',
        createdAt: '2026-09-14T10:42:00',
        read: true,
    },
    {
        id: 4,
        type: 'panic_ack',
        title: 'Sinyal Darurat Direspon',
        body: 'Budi Santoso merespon sinyal darurat Anda',
        href: '/tenant',
        createdAt: '2026-09-10T21:15:00',
        read: true,
    },
];

const typeMeta: Record<
    NotificationType,
    { icon: typeof Bell; className: string }
> = {
    ticket_reply: {
        icon: MessageSquare,
        className: 'bg-(--color-sky)/15 text-(--color-sky-deep)',
    },
    bill_due: {
        icon: CreditCard,
        className: 'bg-amber-100 text-amber-600',
    },
    visitor_used: {
        icon: QrCode,
        className: 'bg-violet-100 text-violet-600',
    },
    panic_ack: {
        icon: AlertOctagon,
        className: 'bg-red-100 text-red-600',
    },
};

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));

    if (hours < 1) {
        return 'Baru saja';
    }

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    const days = Math.floor(hours / 24);

    return `${days} hari lalu`;
}

export default function TenantNotifications() {
    const hasAny = dummyNotifications.length > 0;

    return (
        <>
            <Head title="Notifikasi" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
                <PageHeader title="Notifikasi" tone="tenant" />

                <div className="flex-1 space-y-2.5 overflow-y-auto px-5 pt-4 pb-28">
                    <PushNotificationPrompt />

                    {!hasAny && (
                        <div className="flex flex-col items-center gap-2 pt-16 text-center">
                            <Bell className="h-8 w-8 text-(--color-ink)/25" />
                            <p className="text-sm text-(--color-ink)/45">
                                Belum ada notifikasi.
                            </p>
                        </div>
                    )}

                    {dummyNotifications.map((notif) => (
                        <NotificationItem key={notif.id} notif={notif} />
                    ))}
                </div>

                <TenantBottomNav active="notifications" />
            </div>
        </>
    );
}

function NotificationItem({ notif }: { notif: AppNotification }) {
    const meta = typeMeta[notif.type];
    const Icon = meta.icon;

    return (
        <Link href={notif.href} className="block">
            <div
                className={`flex items-start gap-3 rounded-2xl border p-3.5 ${
                    notif.read
                        ? 'border-(--color-ink)/8 bg-(--color-surface)'
                        : 'border-(--color-sky)/25 bg-(--color-sky)/5'
                }`}
            >
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                >
                    <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-(--color-ink)">
                            {notif.title}
                        </p>
                        {!notif.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-(--color-sky-deep)" />
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-(--color-ink)/55">
                        {notif.body}
                    </p>
                    <p className="mt-1 text-[11px] text-(--color-ink)/35">
                        {timeAgo(notif.createdAt)}
                    </p>
                </div>
            </div>
        </Link>
    );
}

TenantNotifications.layout = (page: React.ReactNode) => page;
