<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * Single source of truth for the registration/account password policy, shared
 * by AppServiceProvider (Password::defaults(), enforced server-side on every
 * submit) and RegistrationController (exposed to the frontend so the "Akun"
 * step can validate live, as the user types, instead of only ever finding out
 * at the very end of the multi-step wizard — see register.tsx's AccountStep).
 *
 * Only active in production, matching the existing Password::defaults()
 * behavior — local/staging never enforced this, so there's nothing to mirror
 * there either.
 */
class PasswordPolicy
{
    public static function active(): bool
    {
        return app()->isProduction();
    }

    /**
     * @return array{minLength: int, requireUpper: bool, requireLower: bool, requireNumber: bool, requireSymbol: bool}
     */
    public static function toArray(): array
    {
        return [
            'minLength' => 12,
            'requireUpper' => true,
            'requireLower' => true,
            'requireNumber' => true,
            'requireSymbol' => true,
        ];
    }

    public static function rule(): ?Password
    {
        if (! self::active()) {
            return null;
        }

        $policy = self::toArray();

        // Deliberately no ->uncompromised() — that calls out to the HaveIBeenPwned
        // API on every submit, and a hit there ("password has appeared in a data
        // leak") isn't something the frontend can check or warn about ahead of
        // time, so it surprised users at the very end of registration. Length +
        // character-class rules below are enough and match what the live
        // checklist in register.tsx already shows.
        $rule = Password::min($policy['minLength']);

        if ($policy['requireUpper'] && $policy['requireLower']) {
            $rule->mixedCase();
        }

        if ($policy['requireNumber']) {
            $rule->numbers();
        }

        if ($policy['requireSymbol']) {
            $rule->symbols();
        }

        return $rule->letters();
    }
}
