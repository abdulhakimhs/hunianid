<?php

namespace App\Http\Controllers\Auth;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ComplexResolverService;
use App\Services\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * GET /register — the entire wizard is one page; steps live in client-side state.
     */
    public function show(Request $request): Response
    {
        return Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            // Set by SocialLoginController on an unmatched Google sign-in. Not pull()ed
            // here — a reload mid-wizard shouldn't lose it; it's only cleared once the
            // account is actually created.
            'googlePrefill' => $request->session()->get('google_prefill'),
            // Set by PhoneLoginController when an OTP was requested for a number that
            // isn't registered yet.
            'quickPhonePrefill' => $request->query('quick') === '1' && $request->query('phone')
                ? ['phone' => $request->query('phone')]
                : null,
        ]);
    }

    /**
     * POST /register/location/preview — read-only lookup for the "found: X — N
     * RT/pengelola terdaftar" messaging shown while the wizard is still being filled in.
     */
    public function previewLocation(Request $request, ComplexResolverService $resolver): JsonResponse
    {
        $data = $request->validate([
            'place_id' => ['required', 'string'],
        ]);

        return response()->json($resolver->previewFromGooglePlaceId($data['place_id']));
    }

    /**
     * POST /register/complete — the one and only write. Everything collected across the
     * wizard's steps is submitted together and created in a single transaction. Returns
     * plain JSON (called via fetch, not Inertia's router) so a failed submission stays
     * inline rather than looking like a page navigation. Logs the account in and sends
     * the frontend straight to the dashboard.
     */
    public function complete(Request $request, RegistrationService $registration): JsonResponse
    {
        // 'google' skips the password requirement — only trusted if it actually matches
        // the email SocialLoginController stashed in session, never the client's say-so
        // alone. 'phone_quick' skips name/email/password entirely (phone-only signup
        // triggered from an unregistered OTP login attempt).
        $mode = 'normal';

        if ($request->input('auth_provider') === 'google') {
            $googlePrefill = $request->session()->get('google_prefill');

            if ($googlePrefill && strtolower((string) ($googlePrefill['email'] ?? '')) === strtolower((string) $request->input('email'))) {
                $mode = 'google';
            }
        } elseif ($request->input('auth_provider') === 'phone_quick') {
            $mode = 'phone_quick';
        }

        $data = $request->validate([
            'role' => ['required', Rule::in(['penghuni', 'pengelola'])],
            'sub_type' => [Rule::requiredIf($request->input('role') === 'pengelola'), Rule::in(['rt_rw', 'developer'])],
            'area_name' => [Rule::requiredIf($request->input('role') === 'pengelola'), 'string', 'max:255'],

            'location_mode' => ['required', Rule::in(['google', 'manual'])],
            'place_id' => ['required_if:location_mode,google', 'string'],
            'location_name' => ['required', 'string', 'max:255'],
            'formatted_address' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'province_code' => ['required_if:location_mode,manual', 'string'],
            'city_code' => ['required_if:location_mode,manual', 'string'],
            'address' => ['nullable', 'string', 'max:255'],

            'name' => $mode === 'phone_quick' ? ['nullable', 'string', 'max:255'] : $this->nameRules(),
            'email' => $mode === 'phone_quick' ? ['nullable', 'string', 'email', 'max:255'] : $this->emailRules(),
            'password' => $mode === 'normal' ? $this->passwordRules() : ['nullable'],
            'phone' => ['required', 'string', 'max:20', Rule::unique(User::class)],

            // Only meaningful for Penghuni joining an existing (non-unclaimed) area —
            // RegistrationService enforces the real requirement once it knows how many
            // active areas the resolved complex actually has.
            'area_id' => ['nullable', 'integer'],
            'unit_number' => ['nullable', 'string', 'max:50'],
            'block' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $registration->register($data, $mode);

        auth()->login($user);
        $request->session()->regenerate();
        $request->session()->forget('google_prefill');

        return response()->json(['redirect' => route('dashboard')]);
    }
}
