<?php

namespace App\Console\Commands;

use App\Services\InvoiceNotificationService;
use App\Services\RecurringInvoiceService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('invoices:generate-recurring')]
#[Description('Generate invoices from due recurring templates and broadcast them')]
class GenerateRecurringInvoices extends Command
{
    public function handle(RecurringInvoiceService $recurring, InvoiceNotificationService $notifier): void
    {
        $created = $recurring->generateDue();

        foreach ($created as $invoice) {
            $notifier->sendCreatedBroadcast($invoice);
        }

        $this->info("Generated {$created->count()} recurring invoice(s).");
    }
}
