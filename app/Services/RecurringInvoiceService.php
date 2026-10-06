<?php

namespace App\Services;

use App\Models\InvoiceTemplate;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RecurringInvoiceService
{
    public function __construct(private readonly InvoiceService $invoices)
    {
    }

    /**
     * Generate invoices for every active template whose next run is due, then advance
     * each template's schedule. Each template runs in its own transaction so one bad
     * template can't roll back another's generation.
     *
     * @return Collection<int, \App\Models\Invoice>
     */
    public function generateDue(): Collection
    {
        $due = InvoiceTemplate::where('is_active', true)
            ->where('next_run_date', '<=', Carbon::today())
            ->get();

        return $due->flatMap(function (InvoiceTemplate $template) {
            return DB::transaction(function () use ($template) {
                $created = $this->invoices->createFromTemplate($template);

                $template->update([
                    'next_run_date' => Carbon::parse($template->next_run_date)->addMonthNoOverflow(),
                    'last_run_at' => now(),
                ]);

                return $created;
            });
        })->values();
    }
}
