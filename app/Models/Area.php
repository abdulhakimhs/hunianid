<?php

namespace App\Models;

use Database\Factories\AreaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['complex_id', 'name', 'type', 'status', 'require_approval', 'created_by', 'invitation_message'])]
class Area extends Model
{
    /** @use HasFactory<AreaFactory> */
    use HasFactory;

    public const DEFAULT_INVITATION_MESSAGE = 'Halo! Anda diundang bergabung sebagai warga {komplek} untuk unit {unit}. '.
        'Silakan daftar lewat tautan berikut: {link}';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'require_approval' => 'boolean',
        ];
    }

    public function invitationMessageTemplate(): string
    {
        return $this->invitation_message ?: self::DEFAULT_INVITATION_MESSAGE;
    }

    /**
     * @return BelongsTo<Complex, $this>
     */
    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class);
    }

    /**
     * @return HasMany<AreaMember, $this>
     */
    public function areaMembers(): HasMany
    {
        return $this->hasMany(AreaMember::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'area_members')
            ->withPivot(['role_id', 'status', 'approved_by', 'approved_at'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Unit, $this>
     */
    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }

    /**
     * @return HasMany<Invite, $this>
     */
    public function invites(): HasMany
    {
        return $this->hasMany(Invite::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
