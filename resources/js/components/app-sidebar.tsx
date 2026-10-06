import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CircleDollarSign,
    LayoutGrid,
    MapPinned,
    Megaphone,
    ReceiptText,
    Send,
    Settings2,
    ShieldCheck,
    Tags,
    Ticket,
    UserCheck,
    UserCog,
    Users,
    UsersRound,
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
import type { AdminAccess, NavItem } from '@/types';

function buildNavGroups(adminAccess: AdminAccess, isTenant: boolean) {
    const isAdminSide = !isTenant;

    return [
        {
            label: 'Utama',
            items: [
                {
                    title: 'Dashboard',
                    href: dashboard(),
                    icon: LayoutGrid,
                },
                {
                    title: 'Peta Unit',
                    href: '/units-map',
                    icon: MapPinned,
                },
                {
                    title: 'Keluarga Saya',
                    href: '/family',
                    icon: UsersRound,
                    requires: isTenant,
                },
            ].filter((item) => item.requires ?? true),
        },
        {
            label: 'Warga',
            items: [
                {
                    title: 'Kepemilikan & Warga',
                    href: '/admin/members',
                    icon: Users,
                    requires: adminAccess.members,
                    items: [
                        {
                            title: 'Undangan',
                            href: '/admin/invites',
                            icon: Send,
                            requires: adminAccess.invites,
                        },
                        {
                            title: 'Menunggu Persetujuan',
                            href: '/admin/members/pending',
                            icon: UserCheck,
                            requires: adminAccess.pendingApprovals,
                        },
                    ],
                },

                {
                    title: 'Unit / Rumah',
                    href: '/admin/units',
                    icon: Building2,
                    requires: adminAccess.members,
                },
            ].filter((item) => item.requires ?? true),
        },
        {
            label: 'Staf & Keamanan',
            items: [
                {
                    title: 'Security',
                    href: '/admin/security',
                    icon: ShieldCheck,
                    requires: adminAccess.security,
                },
                {
                    title: 'Staff RT',
                    href: '/admin/staff',
                    icon: UserCog,
                    requires: adminAccess.staffManagement,
                },
                {
                    title: 'Pengunjung',
                    href: '/admin/visitor-passes',
                    icon: Users,
                    requires: adminAccess.visitorPasses,
                },
            ].filter((item) => item.requires ?? true),
        },
        {
            label: 'Komunikasi',
            items: [
                {
                    title: 'Pengumuman',
                    href: '/admin/announcements',
                    icon: Megaphone,
                    requires: adminAccess.announcements,
                },
                {
                    // Admin-side complaint/ticket triage — a tenant's own tickets live
                    // under /tenant/tickets, outside this sidebar entirely.
                    title: 'Tiket & Komplain',
                    href: '#',
                    icon: Ticket,
                    requires: isAdminSide,
                },
            ].filter((item) => item.requires ?? true),
        },
        {
            label: 'Keuangan',
            items: [
                {
                    title: 'Tagihan',
                    href: '/admin/invoices',
                    icon: ReceiptText,
                    requires: adminAccess.invoices,
                },
                {
                    title: 'Pembayaran',
                    href: '/admin/invoices?tab=history',
                    icon: CircleDollarSign,
                    requires: adminAccess.invoices,
                },
                {
                    title: 'Kategori Tagihan',
                    href: '/admin/invoice-categories',
                    icon: Tags,
                    requires: adminAccess.invoices,
                },
            ].filter((item) => item.requires ?? true),
        },
        {
            label: 'Lainnya',
            items: [
                {
                    title: 'Pengaturan',
                    href: '/admin/settings',
                    icon: Settings2,
                    requires: adminAccess.settings,
                },
            ].filter((item) => item.requires ?? true),
        },
    ].filter((group) => group.items.length > 0);
}

const footerNavItems: NavItem[] = [
    // {
    //     title: 'Repository',
    //     href: 'https://github.com/laravel/react-starter-kit',
    //     icon: FolderGit2,
    // },
    // {
    //     title: 'Documentation',
    //     href: 'https://laravel.com/docs/starter-kits#react',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const currentMembership = auth.memberships.find((m) => m.id === auth.currentMembershipId);
    const isTenant = currentMembership?.roleKey === 'resident';
    const mainNavGroups = buildNavGroups(auth.adminAccess, isTenant);

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-white/10 bg-(--color-ink) text-(--color-surface)"
        >
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
