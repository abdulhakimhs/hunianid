<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;

class UnitsController extends Controller
{
    /**
     * GET /admin/units — full unit list.
     */
    public function index(Request $request): Response
    {
        $area = $request->attributes->get('adminArea');
        $user = $request->user()->load('lastMembership.area.complex');
        //dd($user->lastMembership);

        $units = Unit::where('area_id', $area->id)->get();
        return Inertia::render('admin/units/index', [
            'units' => $units,
            'user' => $user,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user()->load('lastMembership.area');
        DB::transaction(function () use ($user, $request) {
            $block = $request->input('block');
            $unitNumber = $request->input('unit_number');
            $normalizedAddress = $this->normalize($block, $unitNumber);
            Unit::create([
                'area_id' => $user->lastMemberShip->area_id,
                'complex_id' => $user->lastMemberShip->area->complex_id,
                'unit_number' => $request->input('unit_number'),
                'block' => $request->input('block'),
                'normalized_address' => $normalizedAddress,
                'status' => $request->input('status', 'active'),
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
        ]);

        return redirect()->route('admin.units.index');
    }

    private function normalize(?string $block, string $unitNumber): string
    {
        return strtolower(trim(($block ?? '') . ' ' . $unitNumber));
    }
}
