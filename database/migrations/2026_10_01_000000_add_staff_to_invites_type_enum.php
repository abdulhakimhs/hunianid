<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE invites MODIFY type ENUM('resident','security','staff') DEFAULT 'resident'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE invites MODIFY type ENUM('resident','security') DEFAULT 'resident'");
    }
};
