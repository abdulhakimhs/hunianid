<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'area_id', 'unit_id', 'user_id', 'category', 'subject', 'status', 'source',
    'priority', 'assigned_to', 'tenant_last_read_at', 'last_followup_at',
    'last_escalation_sent_at', 'closed_at', 'closed_by',
])]
class Ticket extends Model
{
    protected function casts(): array
    {
        return [
            'tenant_last_read_at' => 'datetime',
            'last_followup_at' => 'datetime',
            'last_escalation_sent_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->orderBy('created_at');
    }
}
