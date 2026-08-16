import { Link, router } from '@inertiajs/react';
import { Building2, Check, Loader2, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { postJson } from '@/lib/api';
import { membershipSubtitle } from '@/lib/membership';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { Membership, User } from '@/types';

type Props = {
    user: User;
    memberships: Membership[];
    currentMembershipId: number | null;
};

export function UserMenuContent({ user, memberships, currentMembershipId }: Props) {
    const cleanup = useMobileNavigation();
    const [switching, setSwitching] = useState<number | null>(null);

    const current = memberships.find((m) => m.id === currentMembershipId) ?? null;
    const subtitle = current ? membershipSubtitle(current) : undefined;

    // Distinct areas the user belongs to, in first-seen order.
    const complexes = Array.from(new Map(memberships.map((m) => [m.areaId, { areaId: m.areaId, areaName: m.areaName }])).values());

    // Roles available within whichever area is currently active.
    const rolesInCurrentArea = current ? memberships.filter((m) => m.areaId === current.areaId) : [];

    function switchTo(membershipId: number) {
        if (membershipId === currentMembershipId || switching !== null) {
            return;
        }

        setSwitching(membershipId);

        // Hard redirect, not an Inertia visit — avoids serving a stale prefetch-cached
        // response for the area just switched away from.
        postJson<{ redirect: string }>('/switch-membership', { membership_id: membershipId })
            .then((data) => {
                window.location.href = data.redirect;
            })
            .catch(() => setSwitching(null));
    }

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} subtitle={subtitle} showEmail={false} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Switch Role
                </p>
                <div className="space-y-1">
                    {rolesInCurrentArea.map((m) => {
                        const isActive = m.id === currentMembershipId;

                        return (
                            <button
                                key={m.id}
                                type="button"
                                disabled={switching !== null}
                                onClick={() => switchTo(m.id)}
                                className={`flex w-full items-start justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                            >
                                <span className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <span className="block font-medium">{m.roleLabel}</span>
                                    </span>
                                </span>
                                {switching === m.id ? (
                                    <Loader2 className="size-4 shrink-0 animate-spin" />
                                ) : isActive ? (
                                    <Check className="size-4 shrink-0" />
                                ) : null}
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
                    {complexes.map((complex) => {
                        const isActive = current?.areaId === complex.areaId;
                        // Landing membership for this area if the user switches to it.
                        const target = memberships.find((m) => m.areaId === complex.areaId);

                        if (!target) {
                            return null;
                        }

                        return (
                            <button
                                key={complex.areaId}
                                type="button"
                                disabled={switching !== null}
                                onClick={() => switchTo(target.id)}
                                className={`flex w-full items-start justify-between rounded-md px-2.5 py-2 text-left text-sm transition ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                            >
                                <span className="flex items-start gap-2">
                                    <Building2 className="mt-0.5 size-4 shrink-0" />
                                    <span>
                                        <span className="block font-medium">{complex.areaName}</span>
                                    </span>
                                </span>
                                {switching === target.id ? (
                                    <Loader2 className="size-4 shrink-0 animate-spin" />
                                ) : isActive ? (
                                    <Check className="size-4 shrink-0" />
                                ) : null}
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
