<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // MySQL-only enum change; SQLite (test suite) has no MODIFY.
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE invites MODIFY type ENUM('resident','security','staff') DEFAULT 'resident'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE invites MODIFY type ENUM('resident','security') DEFAULT 'resident'");
        }
    }
};
