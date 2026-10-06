<?php

namespace App\Services;

use App\Models\Area;
use App\Models\Invoice;
use App\Models\InvoiceTemplate;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function __construct(private readonly InvoiceTenantResolver $tenantResolver)
    {
    }

    /**
     * Create one invoice per selected tenant, resolving each tenant's active unit in
     * this area. Runs inside a single transaction so invoice-number sequencing stays
     * consistent within the batch.
     *
     * @param  array<int>  $tenantUserIds
     * @param  array{amount: float|string, invoice_category_id: int, memo?: ?string, due_date?: ?string}  $attrs
     * @return Collection<int, Invoice>
     */
    public function createForTenants(Area $area, array $tenantUserIds, array $attrs): Collection
    {
        return DB::transaction(function () use ($area, $tenantUserIds, $attrs) {
            $tenants = User::whereIn('id', $tenantUserIds)
                ->with(['units' => fn ($q) => $q->wherePivot('status', 'active')->where('area_id', $area->id)])
                ->get();

            return $tenants->map(function (User $tenant) use ($area, $attrs) {
                $unit = $tenant->units->first();

                if (! $unit) {
                    return null;
                }

                return $this->create($area, $unit, $tenant, $attrs);
            })->filter()->values();
        });
    }

    /**
     * Generate invoices for every tenant dynamically resolved from a recurring
     * template's scope rule — never a frozen list stored on the template.
     *
     * @return Collection<int, Invoice>
     */
    public function createFromTemplate(InvoiceTemplate $template): Collection
    {
        return DB::transaction(function () use ($template) {
            $area = $template->area;
            $targets = $this->tenantResolver->resolve($area, $template->scope_type, $template->scope_params);

            $attrs = [
                'amount' => $template->amount,
                'invoice_category_id' => $template->invoice_category_id,
                'memo' => $template->memo,
                'due_date' => Carbon::today()->addDays($template->due_in_days)->toDateString(),
            ];

            return $targets->map(fn (array $target) => $this->create($area, $target['unit'], $target['user'], $attrs, $template))
                ->values();
        });
    }

    private function create(Area $area, Unit $unit, User $tenant, array $attrs, ?InvoiceTemplate $template = null): Invoice
    {
        return Invoice::create([
            'area_id' => $area->id,
            'unit_id' => $unit->id,
            'user_id' => $tenant->id,
            'invoice_template_id' => $template?->id,
            'invoice_number' => $this->generateInvoiceNumber($area),
            'invoice_date' => Carbon::today(),
            'due_date' => $attrs['due_date'] ?? null,
            'amount' => $attrs['amount'],
            'status' => 'unpaid',
            'memo' => $attrs['memo'] ?? null,
            'invoice_category_id' => $attrs['invoice_category_id'],
        ]);
    }

    public function generateInvoiceNumber(Area $area): string
    {
        $year = Carbon::now()->format('Y');
        $month = Carbon::now()->format('m');

        $sequence = Invoice::where('area_id', $area->id)
            ->whereYear('invoice_date', $year)
            ->whereMonth('invoice_date', $month)
            ->lockForUpdate()
            ->count() + 1;

        return sprintf('INV/%s/%s/%04d', $year, $month, $sequence);
    }

    public function markPaid(Invoice $invoice, User $by): void
    {
        if (! in_array($invoice->status, ['unpaid', 'overdue'], true)) {
            return;
        }

        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
            'paid_by' => $by->id,
        ]);
    }

    /**
     * @param  Collection<int, Invoice>  $invoices
     */
    public function markPaidBulk(Collection $invoices, User $by): int
    {
        $count = 0;

        foreach ($invoices as $invoice) {
            if (in_array($invoice->status, ['unpaid', 'overdue'], true)) {
                $this->markPaid($invoice, $by);
                $count++;
            }
        }

        return $count;
    }

    public function cancel(Invoice $invoice): void
    {
        if (! in_array($invoice->status, ['unpaid', 'overdue'], true)) {
            return;
        }

        $invoice->update(['status' => 'cancelled']);
    }

    /**
     * @param  Collection<int, Invoice>  $invoices
     */
    public function cancelBulk(Collection $invoices): int
    {
        $count = 0;

        foreach ($invoices as $invoice) {
            if (in_array($invoice->status, ['unpaid', 'overdue'], true)) {
                $this->cancel($invoice);
                $count++;
            }
        }

        return $count;
    }
}
