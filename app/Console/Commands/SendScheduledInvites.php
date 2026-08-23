<?php

namespace App\Console\Commands;

use App\Models\Invite;
use App\Services\TenantInviteService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invites:send-scheduled')]
#[Description('Send targeted tenant invites whose scheduled time has arrived')]
class SendScheduledInvites extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(TenantInviteService $service): void
    {
        $due = Invite::query()
            ->where('status', 'active')
            ->where('send_status', 'pending')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($due as $invite) {
            $service->sendNow($invite);
        }

        $this->info("Sent {$due->count()} scheduled invite(s).");
    }
}
