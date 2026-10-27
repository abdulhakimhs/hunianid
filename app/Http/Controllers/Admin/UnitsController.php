<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UnitsController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    /**
     * GET /admin/units — full unit list.
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');

        $units = Unit::where('area_id', $area->id)->get();

        return Inertia::render('admin/units/index', [
            'units' => $units,
            'area' => $area,
        ]);
    }

    public function store(Request $request)
    {
        $area = $request->attributes->get('adminArea');

        if (! $this->subscriptions->canAddUnit($area)) {
            throw ValidationException::withMessages([
                'unit_number' => 'Paket Anda saat ini sudah mencapai batas jumlah unit. Upgrade paket untuk menambah unit baru.',
            ]);
        }

        $validated = $request->validate([
            'unit_number' => ['required', 'string', 'max:255'],
            'block' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        DB::transaction(function () use ($area, $validated) {
            $normalizedAddress = $this->normalize($validated['block'] ?? null, $validated['unit_number']);
            Unit::create([
                'area_id' => $area->id,
                'complex_id' => $area->complex_id,
                'unit_number' => $validated['unit_number'],
                'block' => $validated['block'] ?? null,
                'normalized_address' => $normalizedAddress,
                'status' => $validated['status'] ?? 'active',
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
            ]);
        });

        return redirect()->route('admin.units.index');
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'unit_number' => ['required', 'string', 'max:255'],
            'block' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'string', 'in:active,inactive'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $normalizedAddress = $this->normalize(
            $validated['block'],
            $validated['unit_number']
        );

        $unit->update([
            'unit_number' => $validated['unit_number'],
            'block' => $validated['block'],
            'normalized_address' => $normalizedAddress,
            'status' => $validated['status'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
        ]);

        return redirect()->route('admin.units.index');
    }

    /**
     * DELETE /admin/units/{unit} — hapus unit dari area admin.
     */
    public function destroy(Request $request, Unit $unit)
    {
        $area = $request->attributes->get('adminArea');

        if ($unit->area_id !== $area->id) {
            abort(422, 'Unit tidak ditemukan di area Anda.');
        }

        $unit->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Unit berhasil dihapus.'),
        ]);

        return redirect()->route('admin.units.index');
    }

    private function normalize(?string $block, string $unitNumber): string
    {
        return strtolower(trim(($block ?? '').' '.$unitNumber));
    }
}
