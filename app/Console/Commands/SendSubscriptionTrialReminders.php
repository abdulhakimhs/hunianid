<?php

namespace App\Console\Commands;

use App\Services\SubscriptionReminderNotificationService;
use App\Services\SubscriptionReminderService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('subscriptions:send-trial-reminders')]
#[Description('Send WhatsApp reminders for trials ending in 7, 3, 2, or 1 day(s)')]
class SendSubscriptionTrialReminders extends Command
{
    public function handle(SubscriptionReminderService $reminders, SubscriptionReminderNotificationService $notifier): void
    {
        $due = $reminders->findDue();

        foreach ($due as $subscription) {
            $notifier->sendReminder($subscription);
        }

        $this->info("Sent {$due->count()} trial reminder(s).");
    }
}
