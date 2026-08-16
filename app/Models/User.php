<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string|null $phone
 * @property string $email
 * @property Carbon|null $phone_verified_at
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property int|null $last_membership_id
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'phone', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<AreaMember, $this>
     */
    public function areaMemberships(): HasMany
    {
        return $this->hasMany(AreaMember::class);
    }

    /**
     * The area_members row the user last explicitly switched to (see MembershipContext)
     * — restored automatically on their next login, since the session-based selection
     * doesn't survive logout.
     *
     * @return BelongsTo<AreaMember, $this>
     */
    public function lastMembership(): BelongsTo
    {
        return $this->belongsTo(AreaMember::class, 'last_membership_id');
    }

    /**
     * @return BelongsToMany<Area, $this>
     */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'area_members')
            ->withPivot(['role_id', 'status', 'approved_by', 'approved_at'])
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<Unit, $this>
     */
    public function units(): BelongsToMany
    {
        return $this->belongsToMany(Unit::class, 'unit_user')
            ->withPivot(['relation', 'status', 'confirmed_by', 'confirmed_at'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Invite, $this>
     */
    public function invitesCreated(): HasMany
    {
        return $this->hasMany(Invite::class, 'created_by');
    }

    /**
     * @return HasMany<OtpCode, $this>
     */
    public function otpCodes(): HasMany
    {
        return $this->hasMany(OtpCode::class);
    }
}
