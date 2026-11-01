<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Bumped every time a payment is successfully applied by
            // SubscriptionService::applyPaymentIfLatest(). Observability only —
            // the actual ordering guard compares subscription_payments.id.
            $table->unsignedInteger('payment_version')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('payment_version');
        });
    }
};
