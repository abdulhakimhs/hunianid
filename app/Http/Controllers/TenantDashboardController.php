<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\VisitorPass;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $unit = $user->units()
            ->wherePivot('status', 'active')
            ->with('area:id,name')
            ->first(['units.id', 'units.unit_number', 'units.block', 'units.area_id']);

        $nextBill = Invoice::where('user_id', $user->id)
            ->whereIn('status', ['unpaid', 'overdue'])
            ->orderBy('due_date')
            ->first();

        $hasAnyActivity = Invoice::where('user_id', $user->id)->exists()
            || VisitorPass::where('user_id', $user->id)->exists();

        return Inertia::render('tenant/dashboard', [
            'resident' => [
                'name' => $user->name,
                'unit' => $unit ? trim(($unit->block ? $unit->block.' ' : '').$unit->unit_number) : null,
            ],
            'nextBill' => $nextBill ? [
                'amount' => (float) $nextBill->amount,
                'dueDate' => $nextBill->due_date?->toDateString(),
            ] : null,
            'isFirstTimeTenant' => ! $hasAnyActivity,
        ]);
    }
}
