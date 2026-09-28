<?php

namespace App\Models;

use Database\Factories\UnitUserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $unit_id
 * @property int $user_id
 * @property string $relation
 * @property string $status
 * @property int|null $confirmed_by
 * @property \Illuminate\Support\Carbon|null $confirmed_at
 */
#[Fillable(['unit_id', 'user_id', 'relation', 'status', 'confirmed_by', 'confirmed_at'])]
class UnitUser extends Model
{
    /** @use HasFactory<UnitUserFactory> */
    use HasFactory;

    protected $table = 'unit_user';

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
