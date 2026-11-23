<?php

namespace App\Providers;

use App\Support\PasswordPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        // Links we generate (invites, QR codes, WhatsApp messages, etc.) must always
        // point at the canonical domain, even when the app is reached through an old
        // fallback host (e.g. the sslip.io URL kept alive after the hunianid.com move).
        URL::forceRootUrl(config('app.url'));

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => PasswordPolicy::rule());
    }
}
