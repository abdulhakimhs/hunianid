<?php

namespace Database\Factories;

use App\Models\Complex;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Complex>
 */
class ComplexFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'google_place_id' => 'ChIJ'.Str::random(20),
            'name' => 'Perumahan '.fake()->city(),
            'formatted_address' => fake()->address(),
            'latitude' => fake()->latitude(-8, -6),
            'longitude' => fake()->longitude(106, 108),
        ];
    }
}
