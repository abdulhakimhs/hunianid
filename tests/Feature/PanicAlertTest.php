<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\PanicAlert;
use App\Models\Role;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use App\Services\PanicNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class PanicAlertTest extends TestCase
{
    use RefreshDatabase;

    private function member(Area $area, string $role, string $status = 'active'): User
    {
        $user = User::factory()->create();

        // AreaMember::create, not the factory — its definition calls Role::factory(), which doesn't exist.
        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => $role], ['label' => ucfirst($role)])->id,
            'status' => $status,
        ]);

        return $user;
    }

    private function resident(Area $area): array
    {
        $user = $this->member($area, 'resident');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);

        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $user->id, 'relation' => 'owner']);

        return [$user, $unit];
    }

    public function test_tenant_with_active_unit_can_trigger_panic_alert(): void
    {
        $area = Area::factory()->create();
        [$tenant, $unit] = $this->resident($area);

        $this->mock(PanicNotificationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('notifySecurityOfPanic')->once();
        });

        $this->actingAs($tenant)
            ->postJson('/tenant/panic/trigger', ['reason' => 'security'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame(1, PanicAlert::count());

        $alert = PanicAlert::first();
        $this->assertSame($area->id, $alert->area_id);
        $this->assertSame($unit->id, $alert->unit_id);
        $this->assertSame($tenant->id, $alert->user_id);
        $this->assertSame('security', $alert->reason);
    }

    public function test_tenant_without_active_unit_gets_422(): void
    {
        $area = Area::factory()->create();
        $tenant = $this->member($area, 'resident');

        $this->mock(PanicNotificationService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('notifySecurityOfPanic');
        });

        $this->actingAs($tenant)
            ->postJson('/tenant/panic/trigger')
            ->assertStatus(422);

        $this->assertSame(0, PanicAlert::count());
    }
}
