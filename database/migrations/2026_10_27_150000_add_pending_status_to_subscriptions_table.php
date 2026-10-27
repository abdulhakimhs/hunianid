<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // MySQL-only enum change; SQLite (test suite) has no MODIFY.
    public function up(): void
    {
        // 'pending' = a paid plan was picked at registration but checkout/payment
        // hasn't completed yet — distinct from 'trialing' (never asked to pay) and
        // 'expired' (had a trial, it ran out). See SubscriptionService::startPendingCheckout().
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('pending', 'trialing', 'active', 'past_due', 'expired', 'canceled') NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE subscriptions MODIFY status ENUM('trialing', 'active', 'past_due', 'expired', 'canceled') NOT NULL");
        }
    }
};
