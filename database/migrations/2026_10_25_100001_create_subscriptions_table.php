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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->unique()->constrained('areas')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans');
            $table->enum('billing_cycle', ['monthly', 'yearly', 'trial']);
            $table->enum('status', ['trialing', 'active', 'past_due', 'expired', 'canceled']);
            $table->dateTime('trial_ends_at')->nullable();
            $table->dateTime('current_period_starts_at')->nullable();
            $table->dateTime('current_period_ends_at')->nullable();
            $table->dateTime('canceled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'trial_ends_at']);
            $table->index(['status', 'current_period_ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
