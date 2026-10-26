<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceCategory;
use App\Models\InvoiceTemplate;
use App\Models\Unit;
use App\Services\InvoiceNotificationService;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvoicesController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoices,
        private readonly InvoiceNotificationService $notifier,
    ) {}

    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $invoices = Invoice::where('area_id', $area->id)
            ->with(['unit:id,unit_number,block', 'user:id,name,phone', 'category:id,name'])
            ->orderByDesc('invoice_date')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'invoiceNumber' => $invoice->invoice_number,
                'invoiceDate' => $invoice->invoice_date->toDateString(),
                'dueDate' => $invoice->due_date?->toDateString(),
                'amount' => (float) $invoice->amount,
                'status' => $invoice->status,
                'paidAt' => $invoice->paid_at?->toDateString(),
                'hasPaymentProof' => $invoice->payment_proof_path !== null,
                'memo' => $invoice->memo,
                'invoiceCategory' => ['id' => $invoice->category->id, 'name' => $invoice->category->name],
                'tenant' => ['id' => $invoice->user->id, 'name' => $invoice->user->name],
                'unit' => ['id' => $invoice->unit->id, 'label' => trim(($invoice->unit->block ?? '').' '.$invoice->unit->unit_number)],
            ]);

        $templates = InvoiceTemplate::where('area_id', $area->id)
            ->with('category:id,name')
            ->withCount('invoices')
            ->latest()
            ->get()
            ->map(fn (InvoiceTemplate $template) => [
                'id' => $template->id,
                'title' => $template->title,
                'amount' => (float) $template->amount,
                'invoiceCategory' => ['id' => $template->category->id, 'name' => $template->category->name],
                'memo' => $template->memo,
                'dayOfMonth' => $template->day_of_month,
                'dueInDays' => $template->due_in_days,
                'nextRunDate' => $template->next_run_date->toDateString(),
                'isActive' => $template->is_active,
                'invoicesCount' => $template->invoices_count,
            ]);

        $categories = InvoiceCategory::where('area_id', $area->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'default_amount'])
            ->map(fn (InvoiceCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'defaultAmount' => $category->default_amount !== null ? (float) $category->default_amount : null,
            ]);

        return Inertia::render('admin/invoices/index', [
            'invoices' => $invoices,
            'templates' => $templates,
            'categories' => $categories,
            'reminderDaysBeforeDue' => $area->reminderDaysBeforeDue(),
        ]);
    }

    public function create(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $units = Unit::where('area_id', $area->id)
            ->with(['residents' => fn ($q) => $q->wherePivot('status', 'active')->wherePivotIn('relation', ['owner', 'tenant'])->activeMemberOf($area)])
            ->get()
            ->map(fn (Unit $unit) => [
                'unitId' => $unit->id,
                'unitLabel' => trim(($unit->block ?? '').' '.$unit->unit_number),
                'tenants' => $unit->residents->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'phone' => $user->phone,
                ])->values(),
            ])
            ->filter(fn ($unit) => $unit['tenants']->isNotEmpty())
            ->values();

        $categories = InvoiceCategory::where('area_id', $area->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'default_amount'])
            ->map(fn (InvoiceCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'defaultAmount' => $category->default_amount !== null ? (float) $category->default_amount : null,
            ]);

        return Inertia::render('admin/invoices/create', [
            'units' => $units,
            'categories' => $categories,
            // Lets the units map's "Buat tagihan" action land here with that unit's
            // tenants pre-selected instead of the admin hunting for it in the list.
            'preselectedUnitId' => $request->integer('unit_id') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'tenant_ids' => ['required', 'array', 'min:1'],
            'tenant_ids.*' => ['integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'invoice_category_id' => ['required', Rule::exists('invoice_categories', 'id')->where('area_id', $area->id)],
            'memo' => ['nullable', 'string', 'max:1000'],
            'due_date' => ['nullable', 'date'],
            'save_as_template' => ['nullable', 'boolean'],
            'template_title' => ['required_if:save_as_template,true', 'string', 'max:255'],
            'day_of_month' => ['required_if:save_as_template,true', 'integer', 'min:1', 'max:28'],
            'due_in_days' => ['nullable', 'integer', 'min:1', 'max:60'],
        ]);

        $createdInvoices = $this->invoices->createForTenants($area, $data['tenant_ids'], [
            'amount' => $data['amount'],
            'invoice_category_id' => $data['invoice_category_id'],
            'memo' => $data['memo'] ?? null,
            'due_date' => $data['due_date'] ?? null,
        ]);

        foreach ($createdInvoices as $invoice) {
            $this->notifier->sendCreatedBroadcast($invoice);
        }

        if ($request->boolean('save_as_template')) {
            InvoiceTemplate::create([
                'area_id' => $area->id,
                'created_by' => $request->user()->id,
                'title' => $data['template_title'],
                'amount' => $data['amount'],
                'invoice_category_id' => $data['invoice_category_id'],
                'memo' => $data['memo'] ?? null,
                'scope_type' => 'area_all_units',
                'frequency' => 'monthly',
                'day_of_month' => $data['day_of_month'],
                'due_in_days' => $data['due_in_days'] ?? 14,
                'next_run_date' => $this->nextRunDate($data['day_of_month']),
                'is_active' => true,
            ]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Tagihan berhasil dibuat.'),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function markPaid(Request $request, Invoice $invoice)
    {
        $area = $request->attributes->get('adminArea');

        if ($invoice->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'paid_at' => ['required', 'date', 'before_or_equal:'.$this->todayInJakarta()],
            'payment_proof' => [
                'required', 'file',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ], [
            'payment_proof.required' => __('Bukti bayar wajib diunggah.'),
            'payment_proof.mimes' => __('Bukti bayar harus berupa JPG, PNG, atau WEBP.'),
            'payment_proof.mimetypes' => __('Bukti bayar harus berupa JPG, PNG, atau WEBP.'),
            'payment_proof.max' => __('Ukuran bukti bayar maksimal 5 MB.'),
            'paid_at.before_or_equal' => __('Tanggal bayar tidak boleh melebihi hari ini.'),
        ]);

        // Private disk + random hashName(): never publicly reachable, original filename discarded.
        $path = $request->file('payment_proof')->store("payment-proofs/{$area->id}", 'local');

        try {
            $marked = $this->invoices->markPaid($invoice, $request->user(), Carbon::parse($data['paid_at']), $path);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);

            throw $e;
        }

        if (! $marked) {
            Storage::disk('local')->delete($path);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Tagihan ditandai lunas.'),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function markPaidBulk(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'invoice_ids' => ['required', 'array', 'min:1'],
            'invoice_ids.*' => ['integer'],
            'paid_at' => ['required', 'date', 'before_or_equal:'.$this->todayInJakarta()],
        ], [
            'paid_at.before_or_equal' => __('Tanggal bayar tidak boleh melebihi hari ini.'),
        ]);

        $invoices = Invoice::where('area_id', $area->id)
            ->whereIn('id', $data['invoice_ids'])
            ->get();

        $count = $this->invoices->markPaidBulk($invoices, $request->user(), Carbon::parse($data['paid_at']));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':count tagihan ditandai lunas.', ['count' => $count]),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function paymentProof(Request $request, Invoice $invoice)
    {
        $area = $request->attributes->get('adminArea');

        if ($invoice->area_id !== $area->id) {
            abort(404);
        }

        return $invoice->paymentProofResponse();
    }

    public function cancel(Request $request, Invoice $invoice)
    {
        $area = $request->attributes->get('adminArea');

        if ($invoice->area_id !== $area->id) {
            abort(404);
        }

        $this->invoices->cancel($invoice);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Tagihan dibatalkan.'),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function cancelBulk(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'invoice_ids' => ['required', 'array', 'min:1'],
            'invoice_ids.*' => ['integer'],
        ]);

        $invoices = Invoice::where('area_id', $area->id)
            ->whereIn('id', $data['invoice_ids'])
            ->get();

        $count = $this->invoices->cancelBulk($invoices);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':count tagihan dibatalkan.', ['count' => $count]),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    /**
     * App runs in UTC, but admins pick "today" in WIB — between 00:00 and 07:00 WIB the
     * UTC date is still yesterday and a plain `before_or_equal:today` would reject it.
     */
    private function todayInJakarta(): string
    {
        return Carbon::now('Asia/Jakarta')->toDateString();
    }

    private function nextRunDate(int $dayOfMonth): Carbon
    {
        $today = Carbon::today();
        $candidate = $today->copy()->day(min($dayOfMonth, $today->daysInMonth));

        if ($candidate->lt($today)) {
            $candidate = $today->copy()->addMonthNoOverflow();
            $candidate = $candidate->day(min($dayOfMonth, $candidate->daysInMonth));
        }

        return $candidate;
    }
}
