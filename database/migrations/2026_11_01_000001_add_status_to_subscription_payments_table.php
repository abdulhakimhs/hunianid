<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            // Plain string, not enum — SQLite (test driver) can't MODIFY an enum,
            // and this doesn't need DB-level enforcement; the model constants do.
            $table->string('status')->default('pending')->after('billing_cycle');
            $table->index(['subscription_id', 'status']);
        });

        // Backfill from the previous ad-hoc inference (paid_at / midtrans_transaction_status)
        // so existing rows aren't all left stuck as 'pending'.
        DB::table('subscription_payments')->whereNotNull('paid_at')->update(['status' => 'paid']);
        DB::table('subscription_payments')
            ->whereNull('paid_at')
            ->whereIn('midtrans_transaction_status', ['deny', 'cancel', 'expire', 'failure'])
            ->update(['status' => 'failed']);
    }

    public function down(): void
    {
        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropIndex(['subscription_id', 'status']);
            $table->dropColumn('status');
        });
    }
};
