<?php

namespace App\Services;

use App\Models\Invoice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class InvoiceReminderService
{
    /**
     * Unpaid/overdue invoices whose due date matches their area's configured
     * "remind N days before due" offset, and that haven't been reminded yet.
     *
     * @return Collection<int, Invoice>
     */
    public function findDue(): Collection
    {
        $today = Carbon::today();

        return Invoice::whereIn('status', ['unpaid', 'overdue'])
            ->whereNull('reminder_sent_at')
            ->whereNotNull('due_date')
            ->with('area')
            ->get()
            ->filter(function (Invoice $invoice) use ($today) {
                $reminderDate = Carbon::parse($invoice->due_date)->subDays($invoice->area->reminderDaysBeforeDue());

                return $reminderDate->isSameDay($today);
            })
            ->values();
    }
}
