<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'phone', 'user_id', 'status', 'collected_fields', 'history',
    'last_unit_user_id', 'last_message_at',
])]
class FamilyChatConversation extends Model
{
    protected function casts(): array
    {
        return [
            'collected_fields' => 'array',
            'history' => 'array',
            'last_message_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lastUnitUser(): BelongsTo
    {
        return $this->belongsTo(UnitUser::class, 'last_unit_user_id');
    }

    public function isStale(): bool
    {
        return $this->last_message_at !== null
            && $this->last_message_at->lt(now()->subHours(2));
    }

    public function resetState(): void
    {
        $this->collected_fields = null;
        $this->history = null;
        $this->status = 'collecting';
        $this->last_unit_user_id = null;
    }
}
