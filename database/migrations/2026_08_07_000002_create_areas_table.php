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
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complex_id')->constrained('complexes')->restrictOnDelete();
            $table->string('name');
            $table->enum('type', ['rt_self_managed', 'paid_manager', 'developer'])->default('rt_self_managed');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->boolean('require_approval')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('areas');
    }
};
