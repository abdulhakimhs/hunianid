import { Link } from '@inertiajs/react';
import { KeyRound, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const tabItems: NavItem[] = [
    {
        title: 'Profil',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Keamanan',
        href: editSecurity(),
        icon: KeyRound,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <Heading
                title="Pengaturan Akun"
                description="Kelola profil dan keamanan akun Anda"
            />

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <nav
                    className="flex gap-2 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible"
                    aria-label="Pengaturan"
                >
                    {tabItems.map((item) => {
                        const isActive = isCurrentOrParentUrl(item.href);
                        const Icon = item.icon ?? UserRound;

                        return (
                            <Link
                                key={toUrl(item.href)}
                                href={item.href}
                                className={cn(
                                    'flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors lg:shrink',
                                    isActive
                                        ? 'bg-[color:var(--color-sky-deep)] text-white shadow-elevated'
                                        : 'text-[color:var(--color-ink)]/60 hover:bg-[color:var(--color-ink)]/5',
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="max-w-2xl flex-1">
                    <section className="space-y-10">{children}</section>
                </div>
            </div>
        </div>
    );
}
