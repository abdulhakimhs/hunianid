import type { Membership } from '@/types';
import { postJson } from '@/lib/api';

export function membershipSubtitle(membership: Membership): string {
    return `${membership.complexName} · ${membership.areaName} - ${membership.roleLabel}`;
}

// Hard redirect, not an Inertia visit — the whole point is that the session's
// active area/role changes, so a stale prefetch-cached response for the
// membership just switched away from must not be served.
export function switchMembership(membershipId: number): Promise<void> {
    return postJson<{ redirect: string }>('/switch-membership', {
        membership_id: membershipId,
    }).then((data) => {
        window.location.href = data.redirect;
    });
}
