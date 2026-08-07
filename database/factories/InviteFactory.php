<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\Invite;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Invite>
 */
class InviteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'area_id' => Area::factory(),
            'created_by' => User::factory(),
            'code' => Str::upper(Str::random(10)),
            'expires_at' => null,
            'status' => 'active',
        ];
    }
}
