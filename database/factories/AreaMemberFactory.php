<?php

namespace Database\Factories;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AreaMember>
 */
class AreaMemberFactory extends Factory
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
            'user_id' => User::factory(),
            'role_id' => Role::factory(),
            'status' => 'active',
            'approved_by' => null,
            'approved_at' => null,
        ];
    }
}
