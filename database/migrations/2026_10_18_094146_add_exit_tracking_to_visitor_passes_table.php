<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visitor_passes', function (Blueprint $table) {
            $table->timestamp('exited_at')->nullable()->after('used_by');
            $table->foreignId('exited_by')->nullable()->after('exited_at')
                  ->constrained('users')
                  ->nullOnDelete();
        });

        // MySQL-only enum change; SQLite (test suite) has no MODIFY.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE visitor_passes MODIFY status ENUM('pending','used','exited','cancelled') DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE visitor_passes SET status = 'used' WHERE status = 'exited'");
            DB::statement("ALTER TABLE visitor_passes MODIFY status ENUM('pending','used','cancelled') DEFAULT 'pending'");
        }

        Schema::table('visitor_passes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('exited_by');
            $table->dropColumn('exited_at');
        });
    }
};
