<?php

namespace App\Http\Controllers;

use App\Models\VisitorPass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantVisitorPassController extends Controller
{
    public function index(Request $request): Response
    {
        $passes = VisitorPass::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (VisitorPass $pass) => [
                'id' => $pass->id,
                'guestName' => $pass->guest_name,
                'guestPhone' => $pass->guest_phone,
                'vehicleInfo' => $pass->vehicle_info,
                'purpose' => $pass->purpose,
                'token' => $pass->token,
                'status' => $pass->status === 'exited' ? 'used' : $pass->status,
                'validFrom' => $pass->valid_from->toIso8601String(),
                'validUntil' => $pass->valid_until->toIso8601String(),
            ]);

        return Inertia::render('tenant/visitor-pass', [
            'passes' => $passes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:30'],
            'vehicle_info' => ['nullable', 'string', 'max:255'],
            'purpose' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        $unit = $user->units()
            ->wherePivot('status', 'active')
            ->first(['units.id', 'units.area_id']);

        abort_if(! $unit, 422, 'Anda tidak memiliki unit aktif.');

        $pass = VisitorPass::create([
            'area_id' => $unit->area_id,
            'unit_id' => $unit->id,
            'user_id' => $user->id,
            'guest_name' => $data['guest_name'],
            'guest_phone' => $data['guest_phone'] ?? null,
            'vehicle_info' => $data['vehicle_info'] ?? null,
            'purpose' => $data['purpose'] ?? null,
            'status' => 'pending',
            'valid_from' => now(),
            'valid_until' => now()->endOfDay(),
            'source' => 'manual',
        ]);

        return response()->json([
            'id' => $pass->id,
            'guestName' => $pass->guest_name,
            'guestPhone' => $pass->guest_phone,
            'vehicleInfo' => $pass->vehicle_info,
            'purpose' => $pass->purpose,
            'token' => $pass->token,
            'status' => $pass->status,
            'validFrom' => $pass->valid_from->toIso8601String(),
            'validUntil' => $pass->valid_until->toIso8601String(),
        ]);
    }

    public function cancel(Request $request, VisitorPass $pass): JsonResponse
    {
        abort_if($pass->user_id !== $request->user()->id, 404);

        if ($pass->status === 'pending') {
            $pass->update(['status' => 'cancelled']);
        }

        return response()->json(['ok' => true]);
    }
}
