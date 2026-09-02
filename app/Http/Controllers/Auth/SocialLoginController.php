<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class SocialLoginController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (Throwable $e) {
            return redirect()->route('login')->withErrors(['email' => 'Gagal masuk dengan Google. Silakan coba lagi.']);
        }

        $email = $googleUser->getEmail();

        if (! $email) {
            return redirect()->route('login')->withErrors(['email' => 'Akun Google tidak memiliki email yang bisa diverifikasi.']);
        }

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();

        if ($user) {
            Auth::login($user);
            $request->session()->regenerate();

            return redirect()->intended(route('dashboard'));
        }

        $request->session()->put('google_prefill', [
            'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: '',
            'email' => $email,
        ]);

        return redirect()->route('register')->with('status', 'Akun Google belum terdaftar. Lengkapi pendaftaran berikut untuk melanjutkan.');
    }
}
