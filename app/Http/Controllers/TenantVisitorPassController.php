<?php

namespace App\Http\Controllers;

use App\Models\UnitUser;
use App\Models\VisitorPass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantVisitorPassController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $unitIds = $user->units()->wherePivot('status', 'active')->pluck('units.id');

        // Every current household member of the tenant's unit(s) sees each
        // other's guests (owner + family), so the household can keep track of
        // who is coming in. Restricted to passes created by people still active
        // on that unit, so a new occupant never sees a previous occupant's guests.
        $householdIds = UnitUser::whereIn('unit_id', $unitIds)
            ->where('status', 'active')
            ->pluck('user_id')
            ->push($user->id)
            ->unique();

        $passes = VisitorPass::whereIn('unit_id', $unitIds)
            ->whereIn('user_id', $householdIds)
            ->with('user:id,name')
            ->latest()
            ->get()
            ->map(fn (VisitorPass $pass) => $this->present($pass, $user->id));

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

        return response()->json($this->present($pass->setRelation('user', $user), $user->id));
    }

    public function cancel(Request $request, VisitorPass $pass): JsonResponse
    {
        // Household members can see each other's passes, but only the person
        // who created a pass may cancel it.
        abort_if($pass->user_id !== $request->user()->id, 404);

        if ($pass->status === 'pending') {
            $pass->update(['status' => 'cancelled']);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(VisitorPass $pass, int $viewerId): array
    {
        return [
            'id' => $pass->id,
            'guestName' => $pass->guest_name,
            'guestPhone' => $pass->guest_phone,
            'vehicleInfo' => $pass->vehicle_info,
            'purpose' => $pass->purpose,
            'token' => $pass->token,
            'status' => $pass->status,
            'validFrom' => $pass->valid_from->toIso8601String(),
            'validUntil' => $pass->valid_until->toIso8601String(),
            'exitedAt' => $pass->exited_at?->toIso8601String(),
            'createdBy' => $pass->user?->name,
            'canCancel' => $pass->user_id === $viewerId,
        ];
    }
}
