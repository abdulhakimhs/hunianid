<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

#[Fillable([
    'area_id', 'unit_id', 'user_id', 'guest_name', 'guest_phone', 'vehicle_info',
    'purpose', 'token', 'status', 'valid_from', 'valid_until', 'source', 'raw_input',
    'used_at', 'used_by',
])]
class VisitorPass extends Model
{
    protected static function booted(): void
    {
        static::creating(function (VisitorPass $pass) {
            $pass->token ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'used_at' => 'datetime',
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

    public function usedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    public function isExpired(): bool
    {
        return $this->status === 'pending' && $this->valid_until->isPast();
    }
}
