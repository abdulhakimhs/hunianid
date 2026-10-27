<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Seeds the plan catalog as a data migration (not a seeder) so a fresh
     * deploy always has a `trial` plan to attach — RegistrationService hard
     * fails pengelola registration without one. Figures mirror the landing
     * page's PLANS array (resources/js/pages/landing.tsx).
     */
    public function up(): void
    {
        DB::table('plans')->insert([
            [
                'key' => 'trial',
                'name' => 'Coba Gratis',
                'max_units' => 50,
                'price_monthly' => null,
                'price_yearly' => null,
                'trial_days' => 30,
                'is_self_service' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'standard',
                'name' => 'Standard',
                'max_units' => 150,
                'price_monthly' => 149000,
                'price_yearly' => 1490000,
                'trial_days' => null,
                'is_self_service' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'custom',
                'name' => 'Custom',
                'max_units' => null,
                'price_monthly' => null,
                'price_yearly' => null,
                'trial_days' => null,
                'is_self_service' => false,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('plans')->whereIn('key', ['trial', 'standard', 'custom'])->delete();
    }
};
