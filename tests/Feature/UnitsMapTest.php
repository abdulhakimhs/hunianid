<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Invoice;
use App\Models\InvoiceCategory;
use App\Models\PanicAlert;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnitsMapTest extends TestCase
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

    private function resident(Area $area, Unit $unit): User
    {
        $user = $this->member($area, 'resident');

        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $user->id, 'relation' => 'owner', 'status' => 'active']);

        return $user;
    }

    public function test_store_persists_valid_latitude_and_longitude(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');

        $this->actingAs($admin)
            ->post('/admin/units', [
                'unit_number' => '101',
                'block' => 'A',
                'status' => 'active',
                'latitude' => -6.123456,
                'longitude' => 106.987654,
            ])
            ->assertRedirect();

        $unit = Unit::where('area_id', $area->id)->first();

        $this->assertNotNull($unit);
        $this->assertSame(-6.123456, round((float) $unit->latitude, 6));
        $this->assertSame(106.987654, round((float) $unit->longitude, 6));
        $this->assertTrue($unit->hasPin());
    }

    public function test_store_rejects_out_of_range_coordinates(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');

        $this->actingAs($admin)
            ->post('/admin/units', [
                'unit_number' => '101',
                'latitude' => 999,
                'longitude' => 106.0,
            ])
            ->assertSessionHasErrors('latitude');

        $this->assertSame(0, Unit::count());
    }

    public function test_units_map_payload_is_scoped_to_the_admins_own_area(): void
    {
        $area = Area::factory()->create();
        $otherArea = Area::factory()->create();

        $admin = $this->member($area, 'superadmin');

        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id, 'latitude' => -6.1, 'longitude' => 106.8]);
        Unit::factory()->create(['area_id' => $otherArea->id, 'complex_id' => $otherArea->complex_id, 'latitude' => -6.2, 'longitude' => 106.9]);

        $response = $this->actingAs($admin)->getJson('/admin/units-map/data');

        $response->assertOk();
        $units = $response->json('units');

        $this->assertCount(1, $units);
        $this->assertSame($unit->id, $units[0]['id']);
    }

    public function test_units_map_payload_reports_counts_and_active_panic_alert(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');

        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $tenant = $this->resident($area, $unit);

        Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'maintenance',
            'subject' => 'Bocor',
            'status' => 'open',
            'source' => 'web',
        ]);

        $category = InvoiceCategory::create(['area_id' => $area->id, 'name' => 'IPL', 'is_active' => true]);
        Invoice::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'invoice_number' => 'INV/TEST/0001',
            'invoice_date' => now(),
            'amount' => 50000,
            'status' => 'overdue',
            'invoice_category_id' => $category->id,
        ]);

        PanicAlert::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'reason' => 'security',
        ]);

        $units = $this->actingAs($admin)->getJson('/admin/units-map/data')->json('units');

        $this->assertSame(1, $units[0]['openTicketCount']);
        $this->assertSame(1, $units[0]['overdueInvoiceCount']);
        $this->assertNotNull($units[0]['activePanicAlert']);
        $this->assertSame($tenant->name, $units[0]['resident']['name']);
    }

    public function test_admin_can_resolve_a_panic_alert_in_their_own_area(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $tenant = $this->resident($area, $unit);

        $alert = PanicAlert::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'reason' => 'medical',
        ]);

        $this->actingAs($admin)
            ->postJson("/admin/panic-alerts/{$alert->id}/resolve")
            ->assertOk()
            ->assertJson(['ok' => true]);

        $alert->refresh();
        $this->assertNotNull($alert->resolved_at);
        $this->assertSame($admin->id, $alert->resolved_by);
        $this->assertFalse($alert->isActive());
    }

    public function test_admin_cannot_resolve_a_panic_alert_in_another_area(): void
    {
        $area = Area::factory()->create();
        $otherArea = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');

        $otherUnit = Unit::factory()->create(['area_id' => $otherArea->id, 'complex_id' => $otherArea->complex_id]);
        $otherTenant = $this->resident($otherArea, $otherUnit);

        $alert = PanicAlert::create([
            'area_id' => $otherArea->id,
            'unit_id' => $otherUnit->id,
            'user_id' => $otherTenant->id,
            'reason' => 'fire',
        ]);

        $this->actingAs($admin)
            ->postJson("/admin/panic-alerts/{$alert->id}/resolve")
            ->assertNotFound();

        $this->assertNull($alert->refresh()->resolved_at);
    }

    public function test_admin_can_create_a_ticket_for_a_unit_with_an_active_resident(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        $tenant = $this->resident($area, $unit);

        $this->actingAs($admin)
            ->postJson("/admin/units-map/{$unit->id}/tickets", [
                'subject' => 'AC mati',
                'category' => 'maintenance',
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame(1, Ticket::count());
        $ticket = Ticket::first();
        $this->assertSame($tenant->id, $ticket->user_id);
        $this->assertSame($unit->id, $ticket->unit_id);
    }

    public function test_admin_cannot_create_a_ticket_for_a_unit_with_no_active_resident(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);

        $this->actingAs($admin)
            ->postJson("/admin/units-map/{$unit->id}/tickets", [
                'subject' => 'AC mati',
                'category' => 'maintenance',
            ])
            ->assertStatus(422);

        $this->assertSame(0, Ticket::count());
    }
}
