<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['phone', 'user_id', 'status', 'collected_fields', 'history', 'ticket_id', 'last_message_at'])]
class TicketChatConversation extends Model
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

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function isStale(): bool
    {
        return $this->last_message_at !== null && $this->last_message_at->lt(now()->subHours(2));
    }

    public function resetState(): void
    {
        $this->collected_fields = null;
        $this->history = null;
        $this->ticket_id = null;
        $this->status = 'collecting';
    }
}
