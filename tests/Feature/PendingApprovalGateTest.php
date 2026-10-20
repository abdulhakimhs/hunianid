<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PendingApprovalGateTest extends TestCase
{
    use RefreshDatabase;

    private function resident(Area $area, string $status): User
    {
        $user = User::factory()->create(['profile_completed_at' => now()]);

        // AreaMember::create, not the factory — its definition calls Role::factory(), which doesn't exist.
        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => 'resident'], ['label' => 'Resident'])->id,
            'status' => $status,
        ]);

        return $user;
    }

    public function test_pending_resident_is_redirected_away_from_dashboard(): void
    {
        $area = Area::factory()->create(['status' => 'active']);
        $user = $this->resident($area, 'pending_approval');

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertRedirect(route('pending-approval'));
    }

    public function test_pending_resident_is_redirected_away_from_tenant_pages(): void
    {
        $area = Area::factory()->create(['status' => 'active']);
        $user = $this->resident($area, 'pending_approval');

        $this->actingAs($user)
            ->get('/tenant')
            ->assertRedirect(route('pending-approval'));
    }

    public function test_pending_resident_can_reach_the_waiting_page_itself(): void
    {
        $area = Area::factory()->create(['status' => 'active']);
        $user = $this->resident($area, 'pending_approval');

        $this->actingAs($user)
            ->get('/menunggu-persetujuan')
            ->assertOk();
    }

    public function test_active_resident_is_not_redirected_to_pending_approval(): void
    {
        $area = Area::factory()->create(['status' => 'active']);
        $user = $this->resident($area, 'active');

        // An approved resident with no outstanding guidance lands on the tenant
        // PWA, not the pending-approval page — the middleware should let them
        // through to /dashboard, which itself then redirects onward.
        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertRedirect(route('tenant.dashboard'));
    }
}
