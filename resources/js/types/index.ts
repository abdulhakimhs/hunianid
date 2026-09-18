export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Area, Complex } from './auth';

export type Unit = {
    id: number;
    area: Area;
    complex: Complex;
    unit_number: string;
    block?: string;
    normalized_address: string;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
};

export type UnitOption = {
    id: number;
    unit_number: string;
    block?: string | null;
};

export type Family = {
    id: number;
    user: { id: number; name: string; phone: string | null };
    unit: { id: number; unit_number: string; block?: string | null };
    relation: 'owner' | 'tenant' | 'family';
    status: 'pending' | 'active' | 'declined';
    created_at?: string;
    updated_at?: string;
};

export type SecurityGuard = {
    id: number;
    user_id: number;
    name: string;
    phone: string;
    email: string | null;
    status: 'active' | 'suspended';
    claimed: boolean;
    created_at?: string;
};

export type SecurityInviteLog = {
    id: number;
    status: 'active' | 'expired' | 'revoked' | 'accepted';
    send_status: 'pending' | 'sent' | 'failed';
    send_error: string | null;
    sent_at: string | null;
    created_at?: string;
};

export type SecurityInviteGuard = {
    id: number;
    name: string;
    phone: string;
    claimed: boolean;
    claim_link: string | null;
    invites: SecurityInviteLog[];
};
