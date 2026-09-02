<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * `profile_completed_at` was added as a plain nullable column with no backfill —
     * every user created before that migration (i.e. anyone who registered normally,
     * with a real name/email, before this column existed) was left null and kept
     * seeing the "Lengkapi profil" dashboard prompt forever. Only phone-quick signups
     * (placeholder name + `@pending.hunianid.local` email) are legitimately incomplete.
     */
    public function up(): void
    {
        DB::table('users')
            ->whereNull('profile_completed_at')
            ->where('email', 'not like', '%@pending.hunianid.local')
            ->update(['profile_completed_at' => DB::raw('created_at')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data backfill — not reversible without risking re-flagging accounts that
        // have since legitimately completed their profile through other means.
    }
};
