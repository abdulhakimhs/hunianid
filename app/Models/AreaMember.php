<?php

namespace App\Models;

use Database\Factories\AreaMemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['area_id', 'user_id', 'role_id', 'status', 'approved_by', 'approved_at'])]
class AreaMember extends Model
{
    /** @use HasFactory<AreaMemberFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Most recent security-claim invite for this membership (role=security only).
     *
     * @return HasOne<Invite, $this>
     */
    public function latestSecurityInvite(): HasOne
    {
        return $this->hasOne(Invite::class)->where('type', 'security')->latestOfMany();
    }

    /**
     * Full log of security-claim invite attempts for this membership, newest first —
     * an admin may invite/re-invite more than once, each attempt kept for the record.
     *
     * @return HasMany<Invite, $this>
     */
    public function securityInvites(): HasMany
    {
        return $this->hasMany(Invite::class)->where('type', 'security')->latest();
    }
}
