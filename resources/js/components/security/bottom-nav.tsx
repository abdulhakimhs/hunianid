import { Link } from '@inertiajs/react';
import { History, Home, QrCode, User } from 'lucide-react';

type Tab = 'home' | 'scan' | 'history' | 'profile';

const tabs: { key: Tab; href: string; icon: typeof Home; label: string }[] = [
    { key: 'home', href: '/security', icon: Home, label: 'Beranda' },
    { key: 'scan', href: '/security/scan', icon: QrCode, label: 'Scan' },
    {
        key: 'history',
        href: '/security/history',
        icon: History,
        label: 'Riwayat',
    },
    { key: 'profile', href: '/security/profile', icon: User, label: 'Profil' },
];

export default function SecurityBottomNav({ active }: { active: Tab }) {
    return (
        <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-sm border-t border-(--color-ink)/8 bg-(--color-surface) pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-4">
                {tabs.map(({ key, href, icon: Icon, label }) => (
                    <Link
                        key={key}
                        href={href}
                        prefetch={['mount', 'hover']}
                        className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                            active === key
                                ? 'text-(--color-mint-deep)'
                                : 'text-(--color-ink)/40'
                        }`}
                    >
                        <Icon className="h-5 w-5" />
                        {label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
