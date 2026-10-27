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
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('order_id')->unique();
            $table->unsignedInteger('gross_amount');
            $table->enum('billing_cycle', ['monthly', 'yearly']);
            $table->string('midtrans_transaction_id')->nullable();
            $table->string('midtrans_transaction_status')->nullable();
            $table->string('payment_type')->nullable();
            $table->string('snap_token')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->json('raw_notification')->nullable();
            $table->timestamps();

            $table->index(['subscription_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
