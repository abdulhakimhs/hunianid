<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\Complex;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Area>
 */
class AreaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'complex_id' => Complex::factory(),
            'name' => 'RT '.fake()->numberBetween(1, 20).' '.fake()->city(),
            'type' => 'rt_self_managed',
            'status' => 'active',
        ];
    }
}
