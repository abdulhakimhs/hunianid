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
        // Single-row, phpMyAdmin-editable config — deliberately not stored in .env,
        // per the business decision to let the key/mode be swapped without a deploy.
        Schema::create('payment_gateway_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('midtrans');
            $table->enum('mode', ['sandbox', 'production'])->default('sandbox');
            $table->string('server_key_sandbox')->nullable();
            $table->string('client_key_sandbox')->nullable();
            $table->string('server_key_production')->nullable();
            $table->string('client_key_production')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_settings');
    }
};
