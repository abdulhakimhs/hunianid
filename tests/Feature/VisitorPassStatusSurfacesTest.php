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

/**
 * An 'exited' pass must be recognized as such everywhere status is read —
 * not fall through to 'pending' (admin list) or be undercounted/mislabeled
 * (security dashboard), which are the two surfaces the exit feature exposed
 * without updating.
 */
class VisitorPassStatusSurfacesTest extends TestCase
{
    use RefreshDatabase;

    private function member(Area $area, string $roleKey): User
    {
        $user = User::factory()->create();

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => $roleKey], ['label' => ucfirst($roleKey)])->id,
            'status' => 'active',
        ]);

        return $user;
    }

    private function exitedPass(Area $area): VisitorPass
    {
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $resident = User::factory()->create();

        return VisitorPass::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $resident->id,
            'guest_name' => 'Budi',
            'status' => 'exited',
            'valid_from' => now()->subHours(2),
            'valid_until' => now()->endOfDay(),
            'used_at' => now()->subHour(),
            'exited_at' => now(),
            'source' => 'manual',
        ]);
    }

    public function test_admin_visitor_pass_list_reports_exited_not_pending(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $pass = $this->exitedPass($area);

        $this->actingAs($admin)
            ->get('/admin/visitor-passes')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/visitor-passes/index')
                ->where('passes.0.id', $pass->id)
                ->where('passes.0.status', 'exited')
                ->has('passes.0.exitedAt'));
    }

    public function test_security_dashboard_counts_and_labels_exited_pass_correctly(): void
    {
        $area = Area::factory()->create();
        $guard = $this->member($area, 'security');
        $this->exitedPass($area);

        $this->actingAs($guard)
            ->get('/security')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('security/dashboard')
                ->where('stats.scansToday', 1)
                ->where('activity.0.status', 'exited'));
    }
}
