<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('phone')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', [
                'collecting',
                'awaiting_unit_choice',
                'awaiting_action_choice',
                'awaiting_remove_choice',
                'awaiting_remove_confirm',
                'awaiting_add_repeat',
                'completed',
                'abandoned',
            ])->default('collecting');
            $table->json('collected_fields')->nullable();
            $table->json('history')->nullable();
            $table->foreignId('last_unit_user_id')->nullable()->constrained('unit_user')->nullOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_chat_conversations');
    }
};
