<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->enum('priority', ['low', 'medium', 'high'])->nullable()->after('category');

            $table->foreignId('assigned_to')->nullable()
                ->after('status')
                ->constrained('users')
                ->nullOnDelete();

            // Stamped on every staff action (status/assignment/priority change, internal
            // note) — the staleness clock the escalation reminder reads, distinct from
            // tenant_last_read_at which tracks the tenant's own read state.
            $table->timestamp('last_followup_at')->nullable()->after('tenant_last_read_at');

            // Throttles the repeat escalation reminder so it fires once per
            // area.ticket_escalation_days window instead of every scheduler tick.
            $table->timestamp('last_escalation_sent_at')->nullable()->after('last_followup_at');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_to');
            $table->dropColumn(['priority', 'last_followup_at', 'last_escalation_sent_at']);
        });
    }
};
