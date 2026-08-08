import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    CircleDollarSign,
    FolderGit2,
    Home,
    LayoutGrid,
    MapPinned,
    ReceiptText,
    Settings2,
    Ticket,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavGroups = [
    {
        label: 'Utama',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Ringkasan Komplek',
                href: '#',
                icon: Home,
            },
            {
                title: 'Peta Unit',
                href: '/units-map',
                icon: MapPinned,
            },
        ],
    },
    {
        label: 'Manajemen',
        items: [
            {
                title: 'Kepemilikan & Warga',
                href: '#',
                icon: Users,
            },
            {
                title: 'Unit / Rumah',
                href: '#',
                icon: Building2,
            },
            {
                title: 'Tiket & Komplain',
                href: '#',
                icon: Ticket,
            },
        ],
    },
    {
        label: 'Keuangan',
        items: [
            {
                title: 'Tagihan',
                href: '#',
                icon: ReceiptText,
            },
            {
                title: 'Pembayaran',
                href: '#',
                icon: CircleDollarSign,
            },
        ],
    },
    {
        label: 'Lainnya',
        items: [
            {
                title: 'Pengunjung',
                href: '#',
                icon: Users,
            },
            {
                title: 'Pengaturan',
                href: '#',
                icon: Settings2,
            },
        ],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className="border-r border-white/10 bg-(--color-ink) text-(--color-surface)">
            <SidebarHeader className="border-b border-white/10 bg-(--color-ink)/95">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="bg-(--color-ink) px-2 py-3">
                <NavMain groups={mainNavGroups} />
            </SidebarContent>

            <SidebarFooter className="border-t border-white/10 bg-(--color-ink)/95">
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
