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
        // endpoint-only unique let a second user on the same device/browser
        // steal the first user's subscription row via updateOrCreate(endpoint),
        // silently reassigning user_id and cutting off the original owner's push.
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['endpoint']);
            $table->unique(['user_id', 'endpoint']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'endpoint']);
            $table->unique('endpoint');
        });
    }
};
