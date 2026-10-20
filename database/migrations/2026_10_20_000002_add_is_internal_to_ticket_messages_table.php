<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_messages', function (Blueprint $table) {
            // Staff-authored internal notes (sender_type='staff', is_internal=true) are
            // never shown to the tenant and never trigger a tenant WhatsApp message —
            // everything else in this table (the original report, system log entries)
            // stays visible to both sides.
            $table->boolean('is_internal')->default(false)->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->dropColumn('is_internal');
        });
    }
};
