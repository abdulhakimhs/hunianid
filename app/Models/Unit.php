<?php

namespace App\Models;

use Database\Factories\UnitFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['area_id', 'complex_id', 'unit_number', 'block', 'normalized_address', 'status'])]
class Unit extends Model
{
    /** @use HasFactory<UnitFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return BelongsTo<Complex, $this>
     */
    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function residents(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'unit_user')
            ->withPivot(['relation', 'status', 'confirmed_by', 'confirmed_at'])
            ->withTimestamps();
    }
}
