<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PhoneLoginController extends Controller
{
    /**
     * POST /login/phone/request — issues a 6-digit OTP for an existing account's phone
     * number. WhatsApp delivery isn't wired up yet, so the code is only exposed back to
     * the caller outside production, for manual testing until that integration ships.
     */
    public function request(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'phone' => 'Nomor HP belum terdaftar. Silakan daftar terlebih dahulu.',
            ]);
        }

        // Only one live code per user at a time — requesting again invalidates the last one.
        $user->otpCodes()->whereNull('verified_at')->delete();

        $code = (string) random_int(100000, 999999);

        $user->otpCodes()->create([
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(5),
        ]);

        return response()->json([
            'ok' => true,
            'expires_in' => 300,
            ...(app()->environment(['local', 'testing']) ? ['dev_code' => $code] : []),
        ]);
    }

    /**
     * POST /login/phone/verify
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string'],
        ]);

        $user = User::where('phone', $data['phone'])->first();

        if (! $user) {
            throw ValidationException::withMessages(['phone' => 'Nomor HP belum terdaftar.']);
        }

        $otp = $user->otpCodes()->whereNull('verified_at')->latest()->first();

        if (! $otp || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages(['code' => 'Kode sudah kedaluwarsa. Silakan minta kode baru.']);
        }

        if ($otp->attempts >= 5) {
            throw ValidationException::withMessages(['code' => 'Terlalu banyak percobaan. Silakan minta kode baru.']);
        }

        if (! Hash::check($data['code'], $otp->code_hash)) {
            $otp->increment('attempts');

            throw ValidationException::withMessages(['code' => 'Kode salah. Coba lagi.']);
        }

        $otp->update(['verified_at' => now()]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['redirect' => route('dashboard')]);
    }
}
