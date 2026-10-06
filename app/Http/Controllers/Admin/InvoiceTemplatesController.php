<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvoiceTemplatesController extends Controller
{
    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1'],
            'invoice_category_id' => ['required', Rule::exists('invoice_categories', 'id')->where('area_id', $area->id)],
            'memo' => ['nullable', 'string', 'max:1000'],
            'day_of_month' => ['required', 'integer', 'min:1', 'max:28'],
            'due_in_days' => ['nullable', 'integer', 'min:1', 'max:60'],
        ]);

        InvoiceTemplate::create([
            'area_id' => $area->id,
            'created_by' => $request->user()->id,
            'title' => $data['title'],
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Template tagihan berulang dibuat.'),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function update(Request $request, InvoiceTemplate $template)
    {
        $area = $request->attributes->get('adminArea');

        if ($template->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'amount' => ['sometimes', 'numeric', 'min:1'],
            'memo' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'day_of_month' => ['sometimes', 'integer', 'min:1', 'max:28'],
            'due_in_days' => ['sometimes', 'integer', 'min:1', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->update($data);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Template tagihan diperbarui.'),
        ]);

        return redirect()->route('admin.invoices.index');
    }

    public function destroy(Request $request, InvoiceTemplate $template)
    {
        $area = $request->attributes->get('adminArea');

        if ($template->area_id !== $area->id) {
            abort(404);
        }

        $template->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Template tagihan dihapus.'),
        ]);

        return redirect()->route('admin.invoices.index');
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
