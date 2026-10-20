<?php

namespace App\Console\Commands;

use App\Models\Area;
use App\Models\Ticket;
use App\Services\TicketNotificationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('tickets:send-escalation-reminders')]
#[Description("Nag the assignee (or area admins) via WhatsApp for tickets stuck open past each area's escalation window")]
class SendTicketEscalationReminders extends Command
{
    public function handle(TicketNotificationService $notifier): void
    {
        $sent = 0;

        Area::query()->each(function (Area $area) use ($notifier, &$sent) {
            $windowDays = $area->ticketEscalationDays();
            $threshold = Carbon::now()->subDays($windowDays);

            $stale = Ticket::where('area_id', $area->id)
                ->where('status', '!=', 'closed')
                ->get()
                ->filter(function (Ticket $ticket) use ($threshold) {
                    $lastFollowup = $ticket->last_followup_at ?? $ticket->created_at;

                    if ($lastFollowup->gt($threshold)) {
                        return false;
                    }

                    // Repeat every window, not just once — only resend once the
                    // previous escalation is itself older than the window.
                    return ! $ticket->last_escalation_sent_at || $ticket->last_escalation_sent_at->lte($threshold);
                });

            foreach ($stale as $ticket) {
                $notifier->notifyEscalation($ticket);
                $ticket->update(['last_escalation_sent_at' => now()]);
                $sent++;
            }
        });

        $this->info("Sent {$sent} ticket escalation reminder(s).");
    }
}
