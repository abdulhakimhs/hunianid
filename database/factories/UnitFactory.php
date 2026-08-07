<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\Complex;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $block = fake()->randomLetter();
        $unitNumber = (string) fake()->numberBetween(1, 50);

        return [
            'area_id' => Area::factory(),
            'complex_id' => Complex::factory(),
            'unit_number' => $unitNumber,
            'block' => $block,
            'normalized_address' => Str::slug("blok {$block} no {$unitNumber}"),
            'status' => 'active',
        ];
    }
}
