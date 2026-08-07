<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['key_name', 'label'])]
class Role extends Model
{
    /**
     * @return HasMany<AreaMember, $this>
     */
    public function areaMembers(): HasMany
    {
        return $this->hasMany(AreaMember::class);
    }
}
