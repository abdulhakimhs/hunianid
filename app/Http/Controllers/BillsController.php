<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillsController extends Controller
{
    public function index(Request $request): Response
    {
        $invoices = Invoice::where('user_id', $request->user()->id)
            ->where('status', '!=', 'cancelled')
            ->with('category:id,name')
            ->orderByDesc('invoice_date')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'invoiceNumber' => $invoice->invoice_number,
                'invoiceDate' => $invoice->invoice_date->toDateString(),
                'dueDate' => $invoice->due_date?->toDateString(),
                'amount' => (float) $invoice->amount,
                'status' => $invoice->status,
                'memo' => $invoice->memo,
                'invoiceCategory' => ['id' => $invoice->category->id, 'name' => $invoice->category->name],
            ]);

        return Inertia::render('tenant/bills', [
            'invoices' => $invoices,
        ]);
    }
}
