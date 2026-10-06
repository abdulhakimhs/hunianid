<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('invoices:flip-overdue')]
#[Description('Flip unpaid invoices past their due date to overdue')]
class FlipOverdueInvoices extends Command
{
    public function handle(): void
    {
        $count = Invoice::where('status', 'unpaid')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', Carbon::today())
            ->update(['status' => 'overdue']);

        $this->info("Flipped {$count} invoice(s) to overdue.");
    }
}
