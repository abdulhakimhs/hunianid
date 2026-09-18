<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_passes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('area_id')
                  ->constrained('areas')
                  ->cascadeOnDelete();

            $table->foreignId('unit_id')
                  ->constrained('units')
                  ->cascadeOnDelete();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('guest_name');
            $table->string('guest_phone')->nullable();
            $table->string('vehicle_info')->nullable();
            $table->text('purpose')->nullable();

            $table->uuid('token')->unique();

            $table->enum('status', ['pending', 'used', 'cancelled'])
                  ->default('pending');

            $table->dateTime('valid_from');
            $table->dateTime('valid_until');

            $table->enum('source', ['manual', 'whatsapp_ai'])->default('manual');
            $table->text('raw_input')->nullable();

            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by')->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamps();

            $table->index(['area_id', 'status']);
            $table->index(['area_id', 'valid_from']);
            $table->index(['unit_id']);
            $table->index(['user_id', 'valid_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_passes');
    }
};
