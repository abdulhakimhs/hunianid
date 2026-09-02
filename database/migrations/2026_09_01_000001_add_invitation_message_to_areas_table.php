<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            // Null = use the app-wide default template (see Area::DEFAULT_INVITATION_MESSAGE).
            // Per-area so each RT/pengelola can word their own resident invitations.
            $table->text('invitation_message')->nullable()->after('require_approval');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->dropColumn('invitation_message');
        });
    }
};
