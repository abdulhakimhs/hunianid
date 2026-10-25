<?php

namespace App\Http\Controllers;

use App\Models\PanicAlert;
use App\Services\PanicNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantPanicController extends Controller
{
    public function trigger(Request $request, PanicNotificationService $service): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'in:medical,security,fire,other'],
        ]);

        $user = $request->user();

        $unit = $user->units()
            ->wherePivot('status', 'active')
            ->first(['units.id', 'units.area_id']);

        abort_if(! $unit, 422, 'Anda tidak memiliki unit aktif.');

        $alert = PanicAlert::create([
            'area_id' => $unit->area_id,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'reason' => $data['reason'] ?? null,
        ]);

        $service->notifySecurityOfPanic($alert);

        return response()->json(['ok' => true, 'alertId' => $alert->id]);
    }
}
