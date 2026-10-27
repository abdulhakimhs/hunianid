<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['key', 'name', 'max_units', 'price_monthly', 'price_yearly', 'trial_days', 'is_self_service', 'sort_order'])]
class Plan extends Model
{
    protected function casts(): array
    {
        return [
            'is_self_service' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Subscription, $this>
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
