<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('invoice_category_id')
                ->after('invoice_template_id')
                ->constrained('invoice_categories')
                ->restrictOnDelete();

            $table->dropColumn('invoice_category');
        });

        Schema::table('invoice_templates', function (Blueprint $table) {
            $table->foreignId('invoice_category_id')
                ->after('created_by')
                ->constrained('invoice_categories')
                ->restrictOnDelete();

            $table->dropColumn('invoice_category');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['invoice_category_id']);
            $table->dropColumn('invoice_category_id');
            $table->enum('invoice_category', ['maintenance_fee', 'utility_bill', 'parking_fee', 'other'])->default('other');
        });

        Schema::table('invoice_templates', function (Blueprint $table) {
            $table->dropForeign(['invoice_category_id']);
            $table->dropColumn('invoice_category_id');
            $table->enum('invoice_category', ['maintenance_fee', 'utility_bill', 'parking_fee', 'other'])->default('other');
        });
    }
};
