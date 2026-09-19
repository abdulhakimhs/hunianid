<?php

namespace App\Http\Controllers\Security;

use App\Http\Controllers\Controller;
use App\Models\VisitorPass;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $entries = VisitorPass::where('area_id', $area->id)
            ->where(fn ($q) => $q->where('status', '!=', 'pending')->orWhere('valid_until', '<', now()))
            ->with('unit:id,unit_number,block')
            ->orderByRaw('COALESCE(used_at, created_at) desc')
            ->limit(200)
            ->get()
            ->map(fn (VisitorPass $pass) => [
                'id' => $pass->id,
                'visitor' => $pass->guest_name,
                'unit' => trim("{$pass->unit?->block} {$pass->unit?->unit_number}") ?: '—',
                'time' => ($pass->used_at ?? $pass->created_at)->translatedFormat('H:i'),
                'date' => ($pass->used_at ?? $pass->created_at)->translatedFormat('d M Y'),
                'status' => match (true) {
                    $pass->status === 'used' => 'used',
                    $pass->status === 'cancelled' => 'cancelled',
                    $pass->isExpired() => 'expired',
                    default => 'expired',
                },
            ]);

        return Inertia::render('security/history', [
            'entries' => $entries,
        ]);
    }
}
