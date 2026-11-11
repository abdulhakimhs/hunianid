<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\PanicAlert;
use App\Models\Role;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use App\Models\VisitorPass;
use App\Services\PanicNotificationService;
use App\Services\WaBlastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Covers the work_and_fix.md batch: residents/family land in the tenant app,
 * the tenant Tamu page lists checked-in guests for the whole household, and the
 * WhatsApp notifications for panic alerts and guest check-in.
 */
class WorkAndFixTest extends TestCase
{
    use RefreshDatabase;

    private function member(Area $area, string $role, array $userAttributes = []): User
    {
        $user = User::factory()->create($userAttributes);

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => $role], ['label' => ucfirst($role)])->id,
            'status' => 'active',
        ]);

        return $user;
    }

    private function pass(Area $area, Unit $unit, User $creator, array $attributes = []): VisitorPass
    {
        return VisitorPass::create(array_merge([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $creator->id,
            'guest_name' => 'Budi',
            'status' => 'pending',
            'valid_from' => now(),
            'valid_until' => now()->endOfDay(),
            'source' => 'manual',
        ], $attributes));
    }

    public function test_resident_is_redirected_from_dashboard_to_tenant_app(): void
    {
        $area = Area::factory()->create();
        $resident = $this->member($area, 'resident');

        $this->actingAs($resident)->get(route('dashboard'))->assertRedirect(route('tenant.dashboard'));
    }

    public function test_family_member_without_membership_is_redirected_to_tenant_app(): void
    {
        $area = Area::factory()->create();
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $family = User::factory()->create();
        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $family->id, 'relation' => 'family']);

        $this->actingAs($family)->get(route('dashboard'))->assertRedirect(route('tenant.dashboard'));
    }

    public function test_tenant_tamu_page_lists_checked_in_guests_of_the_whole_household(): void
    {
        $area = Area::factory()->create();
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $owner = $this->member($area, 'resident');
        $family = User::factory()->create();
        $formerOccupant = User::factory()->create(); // moved out: no unit_user row anymore

        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $owner->id, 'relation' => 'owner']);
        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $family->id, 'relation' => 'family']);

        $inside = $this->pass($area, $unit, $family, ['status' => 'used', 'used_at' => now()]);
        $this->pass($area, $unit, $formerOccupant, ['guest_name' => 'Tamu lama']);

        $this->actingAs($owner)
            ->get('/tenant/visitor-pass')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('tenant/visitor-pass')
                ->has('passes', 1)
                ->where('passes.0.id', $inside->id)
                ->where('passes.0.status', 'used')
                ->where('passes.0.createdBy', $family->name)
                ->where('passes.0.canCancel', false));
    }

    public function test_panic_alert_is_broadcast_on_whatsapp_to_every_area_guard(): void
    {
        $this->withoutDefer();

        $area = Area::factory()->create();
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $tenant = $this->member($area, 'resident');
        $this->member($area, 'security', ['phone' => '081111111111']);
        $this->member($area, 'security', ['phone' => '082222222222']);
        $this->member($area, 'security'); // no phone — skipped

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')->twice()
                ->withArgs(fn (string $phone, string $message) => str_contains($message, 'DARURAT'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $alert = PanicAlert::create(['area_id' => $area->id, 'unit_id' => $unit->id, 'user_id' => $tenant->id, 'reason' => 'fire']);

        app(PanicNotificationService::class)->notifySecurityOfPanic($alert);
    }

    public function test_guest_check_in_notifies_pass_creator_on_whatsapp(): void
    {
        $this->withoutDefer();

        $area = Area::factory()->create();
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $guard = $this->member($area, 'security');
        $host = User::factory()->create(['phone' => '081234567890']);
        $pass = $this->pass($area, $unit, $host);

        $this->mock(WaBlastService::class, function (MockInterface $mock) {
            $mock->shouldReceive('send')->once()
                ->withArgs(fn (string $phone, string $message) => $phone === '081234567890' && str_contains($message, 'Budi'))
                ->andReturn(['ok' => true, 'error' => null]);
        });

        $this->actingAs($guard)
            ->postJson('/security/scan/confirm', ['code' => $pass->token])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame('used', $pass->fresh()->status);
    }
}
