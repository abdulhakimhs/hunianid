<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\AreaMember;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\Unit;
use App\Models\UnitUser;
use App\Models\User;
use App\Services\WaBlastService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Mockery;
use Tests\TestCase;

class TicketEscalationReminderTest extends TestCase
{
    use RefreshDatabase;

    private function member(Area $area, string $role): User
    {
        $user = User::factory()->create(['phone' => fake()->unique()->numerify('08##########')]);

        AreaMember::create([
            'area_id' => $area->id,
            'user_id' => $user->id,
            'role_id' => Role::firstOrCreate(['key_name' => $role], ['label' => ucfirst($role)])->id,
            'status' => 'active',
        ]);

        return $user;
    }

    private function staleTicket(Area $area, ?int $assignedTo = null): Ticket
    {
        $tenant = $this->member($area, 'resident');
        $unit = Unit::factory()->create(['area_id' => $area->id, 'complex_id' => $area->complex_id]);
        UnitUser::factory()->create(['unit_id' => $unit->id, 'user_id' => $tenant->id, 'relation' => 'owner']);

        $ticket = Ticket::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'category' => 'other',
            'subject' => 'Stale ticket',
            'status' => 'open',
            'source' => 'web',
            'assigned_to' => $assignedTo,
        ]);
        $ticket->created_at = Carbon::now()->subDays(10);
        $ticket->save();

        return $ticket;
    }

    public function test_sends_reminder_for_stale_ticket_and_throttles_repeat(): void
    {
        $waBlast = Mockery::mock(WaBlastService::class);
        $waBlast->shouldReceive('send')->once()->andReturn(['ok' => true]);
        $this->app->instance(WaBlastService::class, $waBlast);

        $area = Area::factory()->create(['ticket_escalation_days' => 7]);
        $staff = $this->member($area, 'staff');
        $ticket = $this->staleTicket($area, $staff->id);

        $this->artisan('tickets:send-escalation-reminders')->assertSuccessful();

        $ticket->refresh();
        $this->assertNotNull($ticket->last_escalation_sent_at);

        // Running again immediately must not resend — still throttled by the window.
        $this->artisan('tickets:send-escalation-reminders')->assertSuccessful();
    }

    public function test_repeats_after_the_window_has_passed_again(): void
    {
        $waBlast = Mockery::mock(WaBlastService::class);
        $waBlast->shouldReceive('send')->twice()->andReturn(['ok' => true]);
        $this->app->instance(WaBlastService::class, $waBlast);

        $area = Area::factory()->create(['ticket_escalation_days' => 7]);
        $staff = $this->member($area, 'staff');
        $ticket = $this->staleTicket($area, $staff->id);

        $this->artisan('tickets:send-escalation-reminders')->assertSuccessful();

        $ticket->refresh();
        $ticket->last_escalation_sent_at = Carbon::now()->subDays(8);
        $ticket->save();

        $this->artisan('tickets:send-escalation-reminders')->assertSuccessful();
    }
}
