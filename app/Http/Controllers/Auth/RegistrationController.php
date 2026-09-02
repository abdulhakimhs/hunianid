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

    public function show(Request $request): Response
    {
        return Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),

            'googlePrefill' => $request->session()->get('google_prefill'),

            'quickPhonePrefill' => $request->query('quick') === '1' && $request->query('phone')
                ? ['phone' => $request->query('phone')]
                : null,
        ]);
    }

    public function previewLocation(Request $request, ComplexResolverService $resolver): JsonResponse
    {
        $data = $request->validate([
            'place_id' => ['required', 'string'],
        ]);

        return response()->json($resolver->previewFromGooglePlaceId($data['place_id']));
    }

    public function complete(Request $request, RegistrationService $registration): JsonResponse
    {

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
