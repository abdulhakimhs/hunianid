<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Role;
use App\Models\Unit;
use App\Models\User;
use App\Models\VisitorPass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitorPassExitTest extends TestCase
{
    use RefreshDatabase;

    private function guard(Area $area): User
    {
        $user = User::factory()->create();

        // AreaMember::create, not the factory — its definition calls Role::factory(), which doesn't exist.
        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => 'security'], ['label' => 'Security'])->id,
            'status' => 'active',
        ]);

        return $user;
    }

    private function pass(Area $area, array $attributes = []): VisitorPass
    {
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $user = User::factory()->create();

        return VisitorPass::create(array_merge([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'guest_name' => 'Budi',
            'vehicle_info' => 'Motor merah',
            'purpose' => 'Mengantar makanan',
            'status' => 'pending',
            'valid_from' => now(),
            'valid_until' => now()->endOfDay(),
            'source' => 'manual',
        ], $attributes));
    }

    public function test_verify_reports_used_pass_as_actionable_not_terminal(): void
    {
        $area = Area::factory()->create();
        $guard = $this->guard($area);
        $pass = $this->pass($area, ['status' => 'used', 'used_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'used'])
            ->assertJsonPath('visitor.name', 'Budi');
    }

    public function test_verify_reports_exited_pass_as_terminal(): void
    {
        $area = Area::factory()->create();
        $guard = $this->guard($area);
        $pass = $this->pass($area, ['status' => 'exited', 'used_at' => now(), 'exited_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'exited']);
    }

    public function test_exit_marks_used_pass_as_exited(): void
    {
        $area = Area::factory()->create();
        $guard = $this->guard($area);
        $pass = $this->pass($area, ['status' => 'used', 'used_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/exit', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $pass->refresh();

        $this->assertSame('exited', $pass->status);
        $this->assertSame($guard->id, $pass->exited_by);
        $this->assertNotNull($pass->exited_at);
    }

    public function test_exit_rejects_a_pass_that_has_not_entered_yet(): void
    {
        $area = Area::factory()->create();
        $guard = $this->guard($area);
        $pass = $this->pass($area);

        $this->actingAs($guard)
            ->postJson('/security/scan/exit', ['code' => $pass->token])
            ->assertStatus(422);
    }

    public function test_exit_rejects_a_pass_that_already_exited(): void
    {
        $area = Area::factory()->create();
        $guard = $this->guard($area);
        $pass = $this->pass($area, ['status' => 'exited', 'used_at' => now(), 'exited_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/exit', ['code' => $pass->token])
            ->assertStatus(422);
    }
}
