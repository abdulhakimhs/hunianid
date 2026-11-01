<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            // Set only when this payment's webhook actually mutated the subscription
            // (distinct from paid_at, which is set as soon as settlement is received,
            // even for a payment that then loses the supersede race).
            $table->dateTime('applied_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropColumn('applied_at');
        });
    }
};
