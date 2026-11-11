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

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_users_without_a_pengelola_membership_are_sent_to_the_tenant_app()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('tenant.dashboard'));
    }

    /**
     * "Tamu Aktif" must count a guest who has already entered (status
     * 'used', currently inside) as active, and must not count one who has
     * already exited — the widget used to only count 'pending' passes, so a
     * guest who'd entered dropped out of the count instead of being the
     * most "active" case there is.
     */
    public function test_active_visitor_pass_count_includes_entered_guests_and_excludes_exited_ones()
    {
        $area = Area::factory()->create();
        $admin = User::factory()->create();

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $admin->id,
            'role_id' => Role::firstOrCreate(['key_name' => 'superadmin'], ['label' => 'Superadmin'])->id,
            'status' => 'active',
        ]);

        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $resident = User::factory()->create();

        $makePass = fn (array $attributes) => VisitorPass::create(array_merge([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'guest_name' => 'Tamu',
            'valid_from' => now()->subHour(),
            'valid_until' => now()->endOfDay(),
            'source' => 'manual',
        ], $attributes));

        $makePass(['status' => 'pending']); // not yet arrived, still valid
        $makePass(['status' => 'used', 'used_at' => now()]); // currently inside
        $makePass(['status' => 'exited', 'used_at' => now()->subHour(), 'exited_at' => now()]); // left
        $makePass(['status' => 'cancelled']);

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard')->where('activeVisitorPassesCount', 2));
    }
}
