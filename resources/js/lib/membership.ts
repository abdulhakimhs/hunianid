import type { Membership } from '@/types';

export function membershipSubtitle(membership: Membership): string {
    return `${membership.complexName} · ${membership.areaName} - ${membership.roleLabel}`;
}
