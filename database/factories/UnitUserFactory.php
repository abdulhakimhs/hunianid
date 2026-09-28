<?php

namespace Database\Factories;

use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnitUser>
 */
class UnitUserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'unit_id' => Unit::factory(),
            'user_id' => User::factory(),
            'relation' => 'family',
            'status' => 'active',
            'confirmed_by' => null,
            'confirmed_at' => now(),
        ];
    }
}
