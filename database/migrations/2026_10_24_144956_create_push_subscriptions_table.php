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
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // Push endpoint URLs (esp. Mozilla's autopush service) can run well
            // past the default 255-char varchar — 512 stays safely under MySQL's
            // utf8mb4 index-length limit while covering every provider in use.
            $table->string('endpoint', 512)->unique();
            $table->string('p256dh');
            $table->string('auth');
            $table->timestamps();

            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
