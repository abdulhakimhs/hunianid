import { Link, router } from '@inertiajs/react';
import { Building2, Check, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

const mockRoles = [
    {
        id: 'admin',
        label: 'Pengelola / Admin',
        description: 'Manage complexes and residents',
    },
    {
        id: 'tenant',
        label: 'Tenant / Owner',
        description: 'View your unit and community updates',
    },
] as const;

const mockComplexes = [
    {
        id: 'grisenda',
        name: 'Taman Grisenda',
        address: 'Jl. Cendrawasih No. 12',
    },
    {
        id: 'sentosa',
        name: 'Citra Sentosa',
        address: 'Jl. Merapi Raya No. 8',
    },
] as const;

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const [activeRoleId, setActiveRoleId] = useState<(typeof mockRoles)[number]['id']>(mockRoles[0].id);
    const [activeComplexId, setActiveComplexId] = useState<(typeof mockComplexes)[number]['id']>(mockComplexes[0].id);

    const activeRole = mockRoles.find((role) => role.id === activeRoleId) ?? mockRoles[0];
    const activeComplex = mockComplexes.find((complex) => complex.id === activeComplexId) ?? mockComplexes[0];

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={false} />
                    {/* <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Active context
                        </p>
                        <p className="mt-1 font-medium text-foreground">{activeRole.label}</p>
                        <p className="text-xs text-muted-foreground">{activeComplex.name}</p>
                    </div> */}
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Switch Role
                </p>
                <div className="space-y-1">
                    {mockRoles.map((role) => {
                        const isActive = role.id === activeRoleId;

                        return (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setActiveRoleId(role.id)}
                                className={`flex w-full items-start justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                            >
                                <span className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <span className="block font-medium">{role.label}</span>
                                        {/* <span className="block text-xs text-muted-foreground">
                                            {role.description}
                                        </span> */}
                                    </span>
                                </span>
                                {isActive ? <Check className="size-4 shrink-0" /> : null}
                            </button>
                        );
                    })}
                </div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Switch Complex
                </p>
                <div className="space-y-1">
                    {mockComplexes.map((complex) => {
                        const isActive = complex.id === activeComplexId;

                        return (
                            <button
                                key={complex.id}
                                type="button"
                                onClick={() => setActiveComplexId(complex.id)}
                                className={`flex w-full items-start justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                            >
                                <span className="flex items-start gap-2">
                                    <Building2 className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <span className="block font-medium">{complex.name}</span>
                                        {/* <span className="block text-xs text-muted-foreground">
                                            {complex.address}
                                        </span> */}
                                    </span>
                                </span>
                                {isActive ? <Check className="size-4 shrink-0" /> : null}
                            </button>
                        );
                    })}
                </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
