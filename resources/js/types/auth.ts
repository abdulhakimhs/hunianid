export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
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
