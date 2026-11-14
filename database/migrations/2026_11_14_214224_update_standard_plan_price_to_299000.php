<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('plans')->where('key', 'standard')->update([
            'price_monthly' => 299000,
            'price_yearly' => 2990000,
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('plans')->where('key', 'standard')->update([
            'price_monthly' => 149000,
            'price_yearly' => 1490000,
            'updated_at' => now(),
        ]);
    }
};
