<?php

namespace App\Console\Commands;

use App\Services\InvoiceNotificationService;
use App\Services\InvoiceReminderService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:send-reminders')]
#[Description("Send WhatsApp reminders for invoices due soon per each area's reminder setting")]
class SendInvoiceReminders extends Command
{
    public function handle(InvoiceReminderService $reminders, InvoiceNotificationService $notifier): void
    {
        $due = $reminders->findDue();

        foreach ($due as $invoice) {
            $notifier->sendDueReminder($invoice);
        }

        $this->info("Sent {$due->count()} invoice reminder(s).");
    }
}
