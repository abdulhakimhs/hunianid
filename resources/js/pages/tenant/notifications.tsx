import { Head } from '@inertiajs/react';
import { Bell, Megaphone } from 'lucide-react';
import PageHeader from '@/components/shared/page-header';
import PushNotificationPrompt from '@/components/shared/push-notification-prompt';
import TenantBottomNav from '@/components/tenant/bottom-nav';

type Announcement = {
    id: number;
    title: string;
    body: string;
    areaName: string;
    createdAt: string | null;
};

type Props = {
    announcements: Announcement[];
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

export default function TenantNotifications({ announcements }: Props) {
    const hasAny = announcements.length > 0;

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
                                Belum ada pengumuman.
                            </p>
                        </div>
                    )}

                    {announcements.map((announcement) => (
                        <AnnouncementItem key={announcement.id} announcement={announcement} />
                    ))}
                </div>

                <TenantBottomNav active="notifications" />
            </div>
        </>
    );
}

function AnnouncementItem({ announcement }: { announcement: Announcement }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-(--color-ink)/8 bg-(--color-surface) p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-sky)/15 text-(--color-sky-deep)">
                <Megaphone className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--color-ink)">
                    {announcement.title}
                </p>
                <p className="mt-0.5 text-xs text-(--color-ink)/55">
                    {announcement.body}
                </p>
                <p className="mt-1 text-[11px] text-(--color-ink)/35">
                    {announcement.areaName}
                    {announcement.createdAt ? ` · ${timeAgo(announcement.createdAt)}` : ''}
                </p>
            </div>
        </div>
    );
}

TenantNotifications.layout = (page: React.ReactNode) => page;
