export type Province = {
    id: number;
    code: string;
    name: string;
    meta?: string;
    created_at?: string;
    updated_at?: string;
};

export type City = {
    id: number;
    code: string;
    name: string;
    province: Province;
    meta?: string;
    created_at?: string;
    updated_at?: string;
};

export type Complex = {
    id: number;
    google_place_id?: string;
    source: 'google' | 'manual';
    name: string;
    formatted_address?: string;
    latitude?: number;
    longitude?: number;
    province?: Province;
    city?: City;
    created_at?: string;
    updated_at?: string;
};

export type Area = {
    id: number;
    complex: Complex;
    name: string;
    type?: 'rt_rw' | 'developer';
    status?: 'active' | 'inactive' | 'suspended' | 'unclaimed';
    require_approval: number;
    created_by?: User;
    created_at?: string;
    updated_at?: string;
};

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    last_membership?: {
        id: number;
        area?: Area;
    };
    [key: string]: unknown;
};

export type Membership = {
    id: number;
    areaId: number;
    areaName: string;
    complexName: string;
    roleKey: 'superadmin' | 'staff' | 'security' | 'resident';
    roleLabel: string;
};

export type AdminAccess = {
    members: boolean;
    invites: boolean;
    pendingApprovals: boolean;
    settings: boolean;
    families: boolean;
    security: boolean;
};

export type Auth = {
    user: User;
    memberships: Membership[];
    currentMembershipId: number | null;
    adminAccess: AdminAccess;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
