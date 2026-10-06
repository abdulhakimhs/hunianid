<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InvoiceCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceCategoriesController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $categories = InvoiceCategory::where('area_id', $area->id)
            ->orderBy('name')
            ->get()
            ->map(fn (InvoiceCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'defaultAmount' => $category->default_amount !== null ? (float) $category->default_amount : null,
                'isActive' => $category->is_active,
            ]);

        return Inertia::render('admin/invoice-categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('invoice_categories')->where('area_id', $area->id)],
            'default_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        InvoiceCategory::create([
            'area_id' => $area->id,
            'name' => $data['name'],
            'default_amount' => $data['default_amount'] ?? null,
            'is_active' => true,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Kategori tagihan dibuat.'),
        ]);

        return redirect()->route('admin.invoice-categories.index');
    }

    public function update(Request $request, InvoiceCategory $invoiceCategory)
    {
        $area = $request->attributes->get('adminArea');

        if ($invoiceCategory->area_id !== $area->id) {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('invoice_categories')->where('area_id', $area->id)->ignore($invoiceCategory->id)],
            'default_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $invoiceCategory->update($data);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Kategori tagihan diperbarui.'),
        ]);

        return redirect()->route('admin.invoice-categories.index');
    }

    public function destroy(Request $request, InvoiceCategory $invoiceCategory)
    {
        $area = $request->attributes->get('adminArea');

        if ($invoiceCategory->area_id !== $area->id) {
            abort(404);
        }

        if ($invoiceCategory->invoices()->exists() || $invoiceCategory->templates()->exists()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => __('Kategori masih digunakan oleh tagihan atau template dan tidak bisa dihapus. Nonaktifkan saja jika tidak ingin dipakai lagi.'),
            ]);

            return redirect()->route('admin.invoice-categories.index');
        }

        $invoiceCategory->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Kategori tagihan dihapus.'),
        ]);

        return redirect()->route('admin.invoice-categories.index');
    }
}
