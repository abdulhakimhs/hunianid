<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('key_name', 50)->unique();
            $table->string('label', 100);
            $table->timestamps();
        });

        $now = now();

        DB::table('roles')->insert([
            ['key_name' => 'superadmin', 'label' => 'Super Admin', 'created_at' => $now, 'updated_at' => $now],
            ['key_name' => 'staff', 'label' => 'Staff', 'created_at' => $now, 'updated_at' => $now],
            ['key_name' => 'security', 'label' => 'Security', 'created_at' => $now, 'updated_at' => $now],
            ['key_name' => 'resident', 'label' => 'Resident', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
