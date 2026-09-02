<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            // NULL on all four = the existing generic shareable-link invite (used to
            // invite a future pengurus for an area with no admin yet). Set = a targeted
            // per-tenant invite: one phone number, one specific unit.
            $table->foreignId('unit_id')->nullable()->after('area_id')->constrained('units')->nullOnDelete();
            $table->string('phone', 20)->nullable()->after('unit_id');
            $table->timestamp('scheduled_at')->nullable()->after('expires_at');
            $table->timestamp('sent_at')->nullable()->after('scheduled_at');
            $table->enum('send_status', ['pending', 'sent', 'failed'])->default('pending')->after('status');
            $table->text('send_error')->nullable()->after('send_status');
        });

        // 'accepted' marks a targeted invite as consumed once its tenant registers
        // through it — distinct from 'expired'/'revoked' since it succeeded.
        DB::statement("ALTER TABLE invites MODIFY status ENUM('active', 'expired', 'revoked', 'accepted') NOT NULL DEFAULT 'active'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE invites MODIFY status ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active'");

        Schema::table('invites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('unit_id');
            $table->dropColumn(['phone', 'scheduled_at', 'sent_at', 'send_status', 'send_error']);
        });
    }
};
