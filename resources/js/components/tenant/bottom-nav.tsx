import { Link } from '@inertiajs/react';
import { Bell, Building2, Home, User } from 'lucide-react';

type Tab = 'home' | 'unit' | 'notifications' | 'profile';

const tabs: { key: Tab; href: string; icon: typeof Home; label: string }[] = [
    { key: 'home', href: '/tenant/', icon: Home, label: 'Beranda' },
    { key: 'unit', href: '/tenant/unit', icon: Building2, label: 'Unit Saya' },
    {
        key: 'notifications',
        href: '/tenant/notifications',
        icon: Bell,
        label: 'Notifikasi',
    },
    { key: 'profile', href: '/tenant/profile', icon: User, label: 'Profil' },
];

export default function TenantBottomNav({
    active,
    unreadCount = 0,
}: {
    active: Tab;
    unreadCount?: number;
}) {
    return (
        <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm border-t border-(--color-ink)/8 bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-4">
                {tabs.map(({ key, href, icon: Icon, label }) => (
                    <Link
                        key={key}
                        href={href}
                        className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                            active === key
                                ? 'text-(--color-sky-deep)'
                                : 'text-(--color-ink)/40'
                        }`}
                    >
                        <span className="relative">
                            <Icon className="h-5 w-5" />
                            {key === 'notifications' && unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </span>
                        {label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
