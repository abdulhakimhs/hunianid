<?php

namespace App\Models;

use Database\Factories\InviteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'area_id', 'type', 'unit_id', 'area_member_id', 'created_by', 'code', 'phone',
    'expires_at', 'scheduled_at', 'sent_at', 'status', 'send_status', 'send_error',
])]
class Invite extends Model
{
    /** @use HasFactory<InviteFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<AreaMember, $this>
     */
    public function areaMember(): BelongsTo
    {
        return $this->belongsTo(AreaMember::class);
    }

    public function isTenantInvite(): bool
    {
        return $this->unit_id !== null && $this->phone !== null;
    }

    public function isSecurityInvite(): bool
    {
        return $this->type === 'security';
    }
}
