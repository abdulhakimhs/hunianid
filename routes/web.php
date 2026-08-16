<?php

use App\Http\Controllers\Auth\PhoneLoginController;
use App\Http\Controllers\Auth\RegionController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\Auth\SocialLoginController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MembershipSwitchController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'landing')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::inertia('units-map', 'units-map')->name('units-map');
    Route::post('switch-membership', [MembershipSwitchController::class, 'store'])->name('switch-membership');
});

// /register stays open even for an already-authenticated visitor, not behind `guest` —
// our own route, not Fortify's (Features::registration() is disabled).
Route::get('register', [RegistrationController::class, 'show'])->name('register');
Route::post('register/location/preview', [RegistrationController::class, 'previewLocation'])->name('register.location.preview');
Route::post('register/complete', [RegistrationController::class, 'complete'])->middleware('throttle:register')->name('register.complete');
Route::get('register/regions/provinces', [RegionController::class, 'provinces'])->name('register.regions.provinces');
Route::get('register/regions/cities', [RegionController::class, 'cities'])->name('register.regions.cities');

// Callback path is `auth/google/callback`, not `login/...`, to match GOOGLE_REDIRECT_URI
// and the Google Cloud Console OAuth client's whitelisted redirect URI.
Route::get('auth/google/redirect', [SocialLoginController::class, 'redirect'])->name('login.google.redirect');
Route::get('auth/google/callback', [SocialLoginController::class, 'callback'])->name('login.google.callback');

Route::post('login/phone/request', [PhoneLoginController::class, 'request'])->middleware('throttle:otp-request')->name('login.phone.request');
Route::post('login/phone/verify', [PhoneLoginController::class, 'verify'])->middleware('throttle:otp-verify')->name('login.phone.verify');

require __DIR__ . '/settings.php';
require __DIR__ . '/admin.php';
