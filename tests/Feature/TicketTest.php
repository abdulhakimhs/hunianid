<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TicketTest extends TestCase
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

    public function test_tenant_can_create_ticket_with_photo(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        [$tenant, $unit] = $this->resident($area);

        $this->actingAs($tenant)
            ->post('/tenant/tickets', [
                'subject' => 'Lampu koridor mati',
                'category' => 'maintenance',
                'description' => 'Lampu di koridor lantai 1 mati sejak kemarin.',
                'photo' => UploadedFile::fake()->image('lampu.png'),
            ])
            ->assertSessionHasNoErrors();

        $ticket = Ticket::first();
        $this->assertNotNull($ticket);
        $this->assertSame($area->id, $ticket->area_id);
        $this->assertSame($unit->id, $ticket->unit_id);
        $this->assertSame('open', $ticket->status);

        $message = $ticket->messages->first();
        $this->assertSame('tenant', $message->sender_type);
        Storage::disk('local')->assertExists($message->photo_path);
    }

    public function test_tenant_without_a_unit_cannot_create_a_ticket(): void
    {
        $area = Area::factory()->create();
        $tenant = $this->member($area, 'resident');

        $this->actingAs($tenant)
            ->post('/tenant/tickets', [
                'subject' => 'Test',
                'category' => 'other',
                'description' => 'Test deskripsi',
            ])
            ->assertNotFound();
    }

    public function test_admin_can_change_status_and_close_ticket(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'maintenance',
            'subject' => 'AC mati',
            'status' => 'open',
            'source' => 'web',
        ]);
        $ticket->messages()->create(['sender_type' => 'tenant', 'user_id' => $tenant->id, 'body' => 'AC mati sejak kemarin.']);

        $this->actingAs($admin)
            ->patch("/admin/tickets/{$ticket->id}/status", [
                'status' => 'in_progress',
                'note' => 'Teknisi akan datang besok.',
            ])
            ->assertSessionHasNoErrors();

        $ticket->refresh();
        $this->assertSame('in_progress', $ticket->status);
        $this->assertNotNull($ticket->last_followup_at);
        $this->assertCount(2, $ticket->messages);
        $this->assertSame('system', $ticket->messages->last()->sender_type);

        $this->actingAs($admin)
            ->patch("/admin/tickets/{$ticket->id}/status", ['status' => 'closed'])
            ->assertSessionHasNoErrors();

        $this->assertSame('closed', $ticket->refresh()->status);
    }

    public function test_admin_can_attach_completion_photo_visible_to_tenant(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'maintenance',
            'subject' => 'AC mati',
            'status' => 'in_progress',
            'source' => 'web',
        ]);
        $ticket->messages()->create(['sender_type' => 'tenant', 'user_id' => $tenant->id, 'body' => 'AC mati sejak kemarin.']);

        $this->actingAs($admin)
            ->patch("/admin/tickets/{$ticket->id}/status", [
                'status' => 'closed',
                'note' => 'Sudah diperbaiki.',
                'photo' => UploadedFile::fake()->image('selesai.png'),
            ])
            ->assertSessionHasNoErrors();

        $completionMessage = $ticket->refresh()->messages->last();
        $this->assertFalse($completionMessage->is_internal);
        Storage::disk('local')->assertExists($completionMessage->photo_path);

        $this->actingAs($tenant)
            ->get("/tenant/tickets/{$ticket->id}")
            ->assertInertia(fn ($page) => $page->where(
                'ticket.activity',
                fn ($activity) => collect($activity)->contains(fn ($entry) => $entry['photoUrl'] !== null),
            ));
    }

    public function test_admin_can_send_progress_update_without_changing_status(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'maintenance',
            'subject' => 'AC mati',
            'status' => 'in_progress',
            'source' => 'web',
        ]);
        $ticket->messages()->create(['sender_type' => 'tenant', 'user_id' => $tenant->id, 'body' => 'AC mati sejak kemarin.']);

        $this->actingAs($admin)
            ->post("/admin/tickets/{$ticket->id}/update", ['note' => 'Teknisi sudah dijadwalkan besok pagi.'])
            ->assertSessionHasNoErrors();

        $ticket->refresh();
        $this->assertSame('in_progress', $ticket->status);
        $this->assertNotNull($ticket->last_followup_at);
        $this->assertCount(2, $ticket->messages);
        $this->assertSame('system', $ticket->messages->last()->sender_type);
        $this->assertStringContainsString('Teknisi sudah dijadwalkan besok pagi.', $ticket->messages->last()->body);
    }

    public function test_admin_can_assign_and_set_priority(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        $staff = $this->member($area, 'staff');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'other',
            'subject' => 'Test',
            'status' => 'open',
            'source' => 'web',
        ]);

        $this->actingAs($admin)
            ->patch("/admin/tickets/{$ticket->id}/assign", ['assigned_to' => $staff->id])
            ->assertSessionHasNoErrors();

        $this->assertSame($staff->id, $ticket->refresh()->assigned_to);

        $this->actingAs($admin)
            ->patch("/admin/tickets/{$ticket->id}/priority", ['priority' => 'high'])
            ->assertSessionHasNoErrors();

        $this->assertSame('high', $ticket->refresh()->priority);
    }

    public function test_admin_internal_note_is_hidden_from_tenant(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'other',
            'subject' => 'Test',
            'status' => 'open',
            'source' => 'web',
        ]);
        $ticket->messages()->create(['sender_type' => 'tenant', 'user_id' => $tenant->id, 'body' => 'Awal.']);

        $this->actingAs($admin)
            ->post("/admin/tickets/{$ticket->id}/notes", ['body' => 'Catatan internal rahasia.'])
            ->assertSessionHasNoErrors();

        $note = $ticket->messages()->where('is_internal', true)->first();
        $this->assertNotNull($note);

        $this->actingAs($tenant)
            ->get("/tenant/tickets/{$ticket->id}")
            ->assertInertia(fn ($page) => $page
                ->where('ticket.activity', fn ($activity) => collect($activity)->doesntContain(
                    fn ($entry) => $entry['body'] === 'Catatan internal rahasia.',
                ))
            );
    }

    public function test_tenant_sees_unread_update_flag_and_it_clears_on_read(): void
    {
        $area = Area::factory()->create();
        $admin = $this->member($area, 'superadmin');
        [$tenant, $unit] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'other',
            'subject' => 'Test',
            'status' => 'open',
            'source' => 'web',
        ]);
        $ticket->messages()->create(['sender_type' => 'tenant', 'user_id' => $tenant->id, 'body' => 'Awal.']);

        $this->actingAs($admin)->patch("/admin/tickets/{$ticket->id}/status", ['status' => 'in_progress']);

        $this->actingAs($tenant)
            ->get('/tenant/tickets')
            ->assertInertia(fn ($page) => $page->where('tickets.0.hasUnreadUpdate', true));

        $this->actingAs($tenant)->get("/tenant/tickets/{$ticket->id}");

        $this->actingAs($tenant)
            ->get('/tenant/tickets')
            ->assertInertia(fn ($page) => $page->where('tickets.0.hasUnreadUpdate', false));
    }

    public function test_ticket_photo_is_only_visible_to_owning_tenant(): void
    {
        Storage::fake('local');
        $area = Area::factory()->create();
        [$tenant, $unit] = $this->resident($area);
        [$otherTenant] = $this->resident($area);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'other',
            'subject' => 'Test',
            'status' => 'open',
            'source' => 'web',
        ]);
        $message = $ticket->messages()->create([
            'sender_type' => 'tenant',
            'user_id' => $tenant->id,
            'body' => 'Foto terlampir.',
            'photo_path' => UploadedFile::fake()->image('foto.png')->store("ticket-photos/{$area->id}", 'local'),
        ]);

        $this->actingAs($tenant)->get("/tenant/tickets/{$ticket->id}/messages/{$message->id}/photo")->assertOk();
        $this->actingAs($otherTenant)->get("/tenant/tickets/{$ticket->id}/messages/{$message->id}/photo")->assertNotFound();
    }
}
