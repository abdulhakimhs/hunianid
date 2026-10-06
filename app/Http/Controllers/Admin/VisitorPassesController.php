<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VisitorPass;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitorPassesController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $passes = VisitorPass::where('area_id', $area->id)
            ->with(['unit:id,unit_number,block', 'user:id,name,phone'])
            ->latest()
            ->get()
            ->map(fn (VisitorPass $pass) => [
                'id' => $pass->id,
                'guestName' => $pass->guest_name,
                'guestPhone' => $pass->guest_phone,
                'vehicleInfo' => $pass->vehicle_info,
                'purpose' => $pass->purpose,
                'unit' => trim(($pass->unit?->block ?? '').' '.($pass->unit?->unit_number ?? '')) ?: '—',
                'resident' => $pass->user?->name ?? '—',
                'source' => $pass->source,
                'status' => match (true) {
                    $pass->status === 'used' => 'used',
                    $pass->status === 'cancelled' => 'cancelled',
                    $pass->isExpired() => 'expired',
                    default => 'pending',
                },
                'validFrom' => $pass->valid_from?->toIso8601String(),
                'validUntil' => $pass->valid_until?->toIso8601String(),
                'usedAt' => $pass->used_at?->toIso8601String(),
                'createdAt' => $pass->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/visitor-passes/index', [
            'passes' => $passes,
            'area' => $area,
        ]);
    }
}
