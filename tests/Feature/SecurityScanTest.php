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

class SecurityScanTest extends TestCase
{
    use RefreshDatabase;

    private function makeGuard(Area $area): User
    {
        $guard = User::factory()->create();
        $role = Role::firstOrCreate(['key_name' => 'security'], ['label' => 'Security']);

        AreaMember::factory()->create([
            'area_id' => $area->id,
            'user_id' => $guard->id,
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        return $guard;
    }

    private function makePass(Area $area, array $attributes = []): VisitorPass
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

    public function test_unauthenticated_guest_cannot_access_security_pages(): void
    {
        $this->get('/security')->assertRedirect('/login');
    }

    public function test_non_security_role_is_forbidden(): void
    {
        $area = Area::factory()->create();
        $resident = User::factory()->create();
        $role = Role::firstOrCreate(['key_name' => 'resident'], ['label' => 'Resident']);

        AreaMember::factory()->create([
            'area_id' => $area->id,
            'user_id' => $resident->id,
            'role_id' => $role->id,
            'status' => 'active',
        ]);

        $this->actingAs($resident)->get('/security')->assertForbidden();
    }

    public function test_guard_sees_dashboard_with_real_stats(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $this->makePass($area, ['status' => 'used', 'used_at' => now()]);

        $this->actingAs($guard)
            ->get('/security')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('security/dashboard')
                ->where('stats.scansToday', 1));
    }

    public function test_verify_returns_valid_for_pending_unexpired_pass(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($area);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'valid']);
    }

    public function test_verify_returns_used_for_already_scanned_pass(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($area, ['status' => 'used', 'used_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'used']);
    }

    public function test_verify_returns_expired_for_pending_pass_past_valid_until(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($area, ['valid_until' => now()->subHour()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'expired']);
    }

    public function test_verify_returns_invalid_for_unknown_code(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => 'does-not-exist'])
            ->assertOk()
            ->assertJson(['status' => 'invalid']);
    }

    public function test_verify_returns_invalid_for_pass_from_another_area(): void
    {
        $area = Area::factory()->create();
        $otherArea = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($otherArea);

        $this->actingAs($guard)
            ->postJson('/security/scan/verify', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['status' => 'invalid']);
    }

    public function test_confirm_marks_pass_as_used(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($area);

        $this->actingAs($guard)
            ->postJson('/security/scan/confirm', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $pass->refresh();

        $this->assertSame('used', $pass->status);
        $this->assertSame($guard->id, $pass->used_by);
        $this->assertNotNull($pass->used_at);
    }

    public function test_confirm_rejects_an_already_used_pass(): void
    {
        $area = Area::factory()->create();
        $guard = $this->makeGuard($area);
        $pass = $this->makePass($area, ['status' => 'used', 'used_at' => now()]);

        $this->actingAs($guard)
            ->postJson('/security/scan/confirm', ['code' => $pass->token])
            ->assertStatus(422);
    }
}
