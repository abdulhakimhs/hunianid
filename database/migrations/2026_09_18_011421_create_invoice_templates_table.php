<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->constrained('areas')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

            $table->string('title');
            $table->decimal('amount', 15, 2);
            $table->enum('invoice_category', [
                'maintenance_fee',
                'utility_bill',
                'parking_fee',
                'other',
            ])->default('other');
            $table->text('memo')->nullable();

            // Dynamic scope rule, resolved fresh every time the template runs — never a
            // frozen snapshot of user/unit ids. scope_params is JSON so new scope_type
            // values (e.g. a specific block/unit type later) don't need a migration.
            $table->string('scope_type')->default('area_all_units');
            $table->json('scope_params')->nullable();

            $table->string('frequency')->default('monthly');
            $table->unsignedTinyInteger('day_of_month')->nullable();
            $table->unsignedSmallInteger('due_in_days')->default(14);

            $table->date('next_run_date');
            $table->timestamp('last_run_at')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['area_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_templates');
    }
};
