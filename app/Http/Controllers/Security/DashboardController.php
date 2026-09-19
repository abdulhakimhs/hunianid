<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use App\Models\VisitorPass;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $stats = [
            'scansToday' => VisitorPass::where('area_id', $area->id)
                ->where('status', 'used')
                ->whereDate('used_at', today())
                ->count(),
            'pendingToday' => VisitorPass::where('area_id', $area->id)
                ->where('status', 'pending')
                ->whereDate('valid_until', today())
                ->count(),
            'totalToday' => VisitorPass::where('area_id', $area->id)
                ->whereDate('created_at', today())
                ->count(),
        ];

        $activity = VisitorPass::where('area_id', $area->id)
            ->with('unit:id,unit_number,block')
            ->orderByRaw('COALESCE(used_at, created_at) desc')
            ->limit(5)
            ->get()
            ->map(fn (VisitorPass $pass) => [
                'id' => $pass->id,
                'visitor' => $pass->guest_name,
                'unit' => trim("{$pass->unit?->block} {$pass->unit?->unit_number}") ?: '—',
                'time' => ($pass->used_at ?? $pass->created_at)->diffForHumans(),
                'status' => match (true) {
                    $pass->status === 'used' => 'valid',
                    $pass->status === 'cancelled' => 'invalid',
                    $pass->isExpired() => 'expired',
                    default => 'valid',
                },
            ]);

        return Inertia::render('security/dashboard', [
            'guardName' => $request->user()->name,
            'areaLabel' => "{$area->complex->name}-{$area->name}",
            'stats' => $stats,
            'activity' => $activity,
        ]);
    }
}
