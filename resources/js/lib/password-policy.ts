export type PasswordPolicy = {
    minLength: number;
    requireUpper: boolean;
    requireLower: boolean;
    requireNumber: boolean;
    requireSymbol: boolean;
};

export function passwordPolicyChecks(password: string, policy: PasswordPolicy) {
    return {
        minLength: password.length >= policy.minLength,
        upper: !policy.requireUpper || /[A-Z]/.test(password),
        lower: !policy.requireLower || /[a-z]/.test(password),
        number: !policy.requireNumber || /[0-9]/.test(password),
        symbol: !policy.requireSymbol || /[^A-Za-z0-9]/.test(password),
    };
}

export function passwordMeetsPolicy(password: string, policy: PasswordPolicy | null): boolean {
    if (!policy) {
        return true;
    }

    return Object.values(passwordPolicyChecks(password, policy)).every(Boolean);
}
