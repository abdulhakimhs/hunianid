<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            $table->enum('type', ['resident', 'security'])->default('resident')->after('area_id');

            $table->foreignId('area_member_id')->nullable()->after('unit_id')
                ->constrained('area_members')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('area_member_id');
            $table->dropColumn('type');
        });
    }
};
